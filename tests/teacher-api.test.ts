import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/teacher/questions/route";

afterEach(() => vi.unstubAllEnvs());

describe("teacher question API safety", () => {
  it("rejects a request without an uploaded document before calling either model", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const response = await POST(new Request("http://localhost/api/teacher/questions", { method: "POST", body: new FormData() }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_DOCUMENT");
  });

  it("uses Ollama to generate grounded questions for text when Gemini is not configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.test");
    const mockFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const requestBody = JSON.parse(String(init?.body)) as { messages: Array<{ content: string }> };
      const sourceChunkId = requestBody.messages[1].content.match(/\[([^\s]+) \| page/)?.[1];
      const answers = ["tables", "primary keys", "records", "primary keys", "relational database"];
      const prompts = [
        "Which structure organizes records in a relational database?",
        "What connects tables in the source material?",
        "What do tables organize in the described database?",
        "Which key type connects tables here?",
        "Which database is described as organizing records?",
      ];
      const options = ["tables", "primary keys", "records", "relational database", "queries"];
      return Response.json({ message: { content: JSON.stringify({
        questions: answers.map((answer, index) => ({ prompt: prompts[index], options, correctAnswer: answer, explanation: `The source states this directly: ${answer}.`, sourceChunkId })),
        visualExplanation: { title: "Relational tables", summary: "Tables organize records and connect through keys.", nodes: [
          { id: "tables", label: "Tables", description: "Tables organize records.", sourceChunkId },
          { id: "keys", label: "Primary keys", description: "Primary keys connect tables.", sourceChunkId },
        ], edges: [{ from: "tables", to: "keys", label: "connect through" }] },
      }) } });
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
});
