import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/teacher/questions/route";

afterEach(() => vi.unstubAllEnvs());

describe("teacher question API safety", () => {
  it("extracts a text-based PDF locally in Ollama mode without calling Gemini", async () => {
    vi.stubEnv("GEMINI_API_KEY", "must-not-be-used");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.test");
    const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(url).toBe("http://ollama.test/api/generate");
      const requestBody = JSON.parse(String(init?.body)) as { prompt: string; format: { properties: { questions: { minItems: number; maxItems: number } } } };
      expect(requestBody.prompt).toContain("A relational database organizes records into tables");
      expect(requestBody.format.properties.questions.minItems).toBe(5);
      expect(requestBody.format.properties.questions.maxItems).toBe(5);
      const sourceChunkId = requestBody.prompt.match(/\[([^\s]+) \| page/)?.[1] ?? "missing";
      const options = ["tables", "primary keys", "records", "relational database", "queries"];
      return Response.json({ response: JSON.stringify({
        questions: [
          ["Which structure organizes records in a relational database?", "tables"],
          ["What connects tables in the source material?", "primary keys"],
          ["What do tables organize in the described database?", "records"],
          ["Which key type connects tables here?", "primary keys"],
          ["Which database is described as organizing records?", "relational database"],
        ].map(([prompt, correctAnswer]) => ({ prompt, options, correctAnswer, explanation: `The source explains ${correctAnswer} clearly.`, sourceChunkId })),
        visualExplanation: { title: "Relational tables", summary: "Tables organize records and connect through keys.", nodes: [
          { id: "tables", label: "Tables", description: "Tables organize records.", sourceChunkId },
          { id: "keys", label: "Primary keys", description: "Primary keys connect tables.", sourceChunkId },
        ], edges: [{ from: "tables", to: "keys", label: "connect through" }] },
      }) });
    });
    vi.stubGlobal("fetch", mockFetch);
    const stream = "BT\n/F1 12 Tf\n72 700 Td\n(A relational database organizes records into tables. Tables connect through primary keys.) Tj\nET\n";
    const pdf = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream\nendobj\n%%EOF`;
    const form = new FormData();
    form.set("file", new File([pdf], "notes.pdf", { type: "application/pdf" }));
    form.set("topic", "Relational model");
    form.set("generationPreference", "ollama");
    form.set("count", "5");

    const response = await POST(new Request("http://localhost/api/teacher/questions", { method: "POST", body: form }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.generationProvider).toBe("ollama");
    expect(payload.data.questions).toHaveLength(5);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("reports that OCR is needed instead of falling back to Gemini for a scanned PDF", async () => {
    vi.stubEnv("GEMINI_API_KEY", "must-not-be-used");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    const form = new FormData();
    form.set("file", new File(["%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 0 >>\nstream\nendstream\nendobj\n%%EOF"], "scan.pdf", { type: "application/pdf" }));
    form.set("generationPreference", "ollama");

    const response = await POST(new Request("http://localhost/api/teacher/questions", { method: "POST", body: form }));
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error.code).toBe("PDF_OCR_REQUIRED");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects a request without an uploaded document before calling either model", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const response = await POST(new Request("http://localhost/api/teacher/questions", { method: "POST", body: new FormData() }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_DOCUMENT");
  });

  it("rejects an empty PDF immediately", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const form = new FormData();
    form.set("file", new File([], "empty.pdf", { type: "application/pdf" }));

    const response = await POST(new Request("http://localhost/api/teacher/questions", { method: "POST", body: form }));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("EMPTY_DOCUMENT");
  });

  it("returns an extraction error for a malformed PDF instead of leaving it processing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ candidates: [{ content: { parts: [{ text: "[]" }] } }] })));
    const form = new FormData();
    form.set("file", new File(["%PDF-invalid"], "broken.pdf", { type: "application/pdf" }));

    const response = await POST(new Request("http://localhost/api/teacher/questions", { method: "POST", body: form }));

    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("PDF_MALFORMED");
  });

  it("uses Ollama to generate grounded questions for text when Gemini is not configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.test");
    const mockFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const requestBody = JSON.parse(String(init?.body)) as { prompt: string };
      const sourceChunkId = requestBody.prompt.match(/\[([^\s]+) \| page/)?.[1];
      const answers = ["tables", "primary keys", "records", "primary keys", "relational database"];
      const prompts = [
        "Which structure organizes records in a relational database?",
        "What connects tables in the source material?",
        "What do tables organize in the described database?",
        "Which key type connects tables here?",
        "Which database is described as organizing records?",
      ];
      const options = ["tables", "primary keys", "records", "relational database", "queries"];
      return Response.json({ response: JSON.stringify({
        questions: answers.map((answer, index) => ({ prompt: prompts[index], options, correctAnswer: answer, explanation: `The source states this directly: ${answer}.`, sourceChunkId })),
        visualExplanation: { title: "Relational tables", summary: "Tables organize records and connect through keys.", nodes: [
          { id: "tables", label: "Tables", description: "Tables organize records.", sourceChunkId },
          { id: "keys", label: "Primary keys", description: "Primary keys connect tables.", sourceChunkId },
        ], edges: [{ from: "tables", to: "keys", label: "connect through" }] },
      }) });
    });
    vi.stubGlobal("fetch", mockFetch);

    const form = new FormData();
    form.set("file", new File(["A relational database organizes records into tables. Tables connect through primary keys."], "notes.txt", { type: "text/plain" }));
    form.set("subject", "Database Management Systems");
    form.set("topic", "Relational model");
    form.set("count", "5");
    const response = await POST(new Request("http://localhost/api/teacher/questions", { method: "POST", body: form }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.generationProvider).toBe("ollama");
    expect(payload.data.questions).toHaveLength(5);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("still sends uploaded notes to Ollama when the teacher topic label is not literal source text", async () => {
    vi.stubEnv("GEMINI_API_KEY", "must-not-be-used");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.test");
    const mockFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const requestBody = JSON.parse(String(init?.body)) as { prompt: string };
      const sourceChunkId = requestBody.prompt.match(/\[([^\s]+) \| page/)?.[1];
      const options = ["queue", "stack", "array"];
      return Response.json({ response: JSON.stringify({
        questions: [
          ["Which item is used here?", "queue"],
          ["What does breadth-first search visit?", "vertices"],
          ["Which traversal explores graph levels?", "breadth-first search"],
          ["What does the queue hold during traversal?", "vertices"],
        ].map(([prompt, correctAnswer]) => ({ prompt, options: [correctAnswer, ...options.filter((option) => option !== correctAnswer)].slice(0, 3), correctAnswer, explanation: `The notes explain ${correctAnswer} in the traversal process.`, sourceChunkId })),
        visualExplanation: { title: "Breadth-first search", summary: "The traversal explores graph levels with a queue.", nodes: [
          { id: "search", label: "Breadth-first search", description: "Explores graph levels.", sourceChunkId },
          { id: "queue", label: "Queue", description: "Holds the next vertices.", sourceChunkId },
        ], edges: [{ from: "search", to: "queue", label: "uses" }] },
      }) });
    });
    vi.stubGlobal("fetch", mockFetch);

    const form = new FormData();
    form.set("file", new File(["Breadth-first search uses a queue to visit graph vertices level by level."], "notes.txt", { type: "text/plain" }));
    form.set("topic", "Quantum mechanics");
    form.set("generationPreference", "ollama");
    form.set("count", "4");

    const response = await POST(new Request("http://localhost/api/teacher/questions", { method: "POST", body: form }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.questions).toHaveLength(4);
    expect(payload.data.questions[0].generationStatus).toBe("needs-review");
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("returns a clear error for a diagnostic set below four questions without a count-only retry", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.test");
    const mockFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const requestBody = JSON.parse(String(init?.body)) as { prompt: string };
      const sourceChunkId = requestBody.prompt.match(/\[([^\s]+) \| page/)?.[1];
      return Response.json({ response: JSON.stringify({
        questions: [{
          prompt: "Which data structure does breadth-first search use?",
          options: ["Queue", "Stack", "Tree"],
          correctAnswer: "Queue",
          explanation: "Breadth-first search visits vertices level by level using a queue.",
          sourceChunkId,
        }],
        visualExplanation: { title: "BFS", summary: "BFS visits graph levels in order.", nodes: [
          { id: "bfs", label: "BFS", description: "Explores vertices level by level.", sourceChunkId },
          { id: "queue", label: "Queue", description: "Keeps the next vertex to visit.", sourceChunkId },
        ], edges: [{ from: "bfs", to: "queue", label: "uses" }] },
      }) });
    });
    vi.stubGlobal("fetch", mockFetch);
    const form = new FormData();
    form.set("file", new File(["Breadth-first search uses a queue to visit graph vertices level by level."], "bfs.txt", { type: "text/plain" }));
    form.set("topic", "Breadth-first search");
    form.set("generationPreference", "ollama");
    form.set("count", "5");

    const response = await POST(new Request("http://localhost/api/teacher/questions", { method: "POST", body: form }));
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error.code).toBe("INSUFFICIENT_GENERATED_QUESTIONS");
    expect(payload.error.message).toMatch(/diagnostic set/);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("returns a retryable service error when Ollama is unavailable", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.test");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("connection refused")));
    const form = new FormData();
    form.set("file", new File(["A breadth-first search uses a queue to explore each level of a graph."], "bfs.txt", { type: "text/plain" }));
    form.set("generationPreference", "ollama");

    const response = await POST(new Request("http://localhost/api/teacher/questions", { method: "POST", body: form }));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error.code).toBe("OLLAMA_UNREACHABLE");
    expect(payload.error.message).toMatch(/Start Ollama/);
  });

  it("explains when Ollama returns JSON outside the question contract", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.test");
    const mockFetch = vi.fn(async () => Response.json({ response: JSON.stringify({ unexpected: true }) }));
    vi.stubGlobal("fetch", mockFetch);
    const form = new FormData();
    form.set("file", new File(["A breadth-first search uses a queue to explore each level of a graph."], "bfs.txt", { type: "text/plain" }));
    form.set("generationPreference", "ollama");

    const response = await POST(new Request("http://localhost/api/teacher/questions", { method: "POST", body: form }));
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error.code).toBe("INVALID_GENERATED_RESPONSE");
    expect(payload.error.message).toMatch(/did not match the required question format/);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
