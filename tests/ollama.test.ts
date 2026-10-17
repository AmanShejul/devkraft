import { afterEach, describe, expect, it, vi } from "vitest";
import { generateWithFallback } from "@/features/teacher-portal/generation-provider";
import { generateOllamaJson } from "@/lib/ai/ollama";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("local Ollama JSON generation", () => {
  it("sends the prompt and JSON schema to the configured local model", async () => {
    const mockFetch = vi.fn(async () => Response.json({ response: "{\"questions\":[]}" }));
    vi.stubGlobal("fetch", mockFetch);
    vi.stubEnv("OLLAMA_BASE_URL", "http://localhost:11434/");
    vi.stubEnv("OLLAMA_MODEL", "llama3.2:latest");
    const schema = { type: "object", required: ["questions"] };

    await expect(generateOllamaJson("Make questions from these notes", schema)).resolves.toEqual({ questions: [] });
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:11434/api/generate");
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: "llama3.2:latest",
      format: schema,
      stream: false,
      options: { temperature: 0.2, num_predict: 4096, num_ctx: 8192 },
      prompt: "Make questions from these notes",
      system: expect.any(String),
    });
  });

  it("caps output length for faster bounded question generation", async () => {
    const mockFetch = vi.fn(async () => Response.json({ response: "{\"questions\":[]}" }));
    vi.stubGlobal("fetch", mockFetch);

    await generateOllamaJson("Make five questions", { type: "object" }, { maxOutputTokens: 2_800 });

    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).options.num_predict).toBe(2_800);
  });

  it("reports unavailable local Ollama without leaking network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));

    await expect(generateOllamaJson("prompt", { type: "object" })).rejects.toThrow("OLLAMA_UNREACHABLE");
  });

  it("reports a missing Ollama model from the generate endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "model 'missing' not found" }, { status: 404 })));

    await expect(generateOllamaJson("prompt", { type: "object" })).rejects.toThrow("OLLAMA_MODEL_NOT_FOUND");
  });

  it("rejects malformed generate response JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ response: "not-json" })));

    await expect(generateOllamaJson("prompt", { type: "object" })).rejects.toThrow("INVALID_OLLAMA_RESPONSE");
  });

  it("cancels the local request when its caller aborts", async () => {
    const requestStarted = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    }));
    vi.stubGlobal("fetch", requestStarted);
    const controller = new AbortController();
    const pending = generateOllamaJson("prompt", { type: "object" }, { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toThrow("OLLAMA_CANCELLED");
  });

  it("times out an Ollama request using the configured limit", async () => {
    vi.stubEnv("OLLAMA_TIMEOUT_MS", "1000");
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Timed out", "AbortError")), { once: true });
    })));

    await expect(generateOllamaJson("prompt", { type: "object" })).rejects.toThrow("OLLAMA_TIMEOUT");
  });

  it("falls back when Gemini output fails validation", async () => {
    const calls: string[] = [];
    const result = await generateWithFallback([
      { provider: "gemini", generate: async () => { calls.push("gemini"); return { malformed: true }; } },
      { provider: "ollama", generate: async () => { calls.push("ollama"); return { questions: ["grounded"] }; } },
    ], (value) => {
      if (!value || typeof value !== "object" || !Array.isArray((value as { questions?: unknown }).questions)) {
        throw new Error("INVALID_MODEL_OUTPUT");
      }
      return (value as { questions: string[] }).questions;
    });

    expect(calls).toEqual(["gemini", "ollama"]);
    expect(result).toEqual({ provider: "ollama", result: ["grounded"] });
  });

  it("retries a local model once when its output fails validation", async () => {
    let calls = 0;
    const result = await generateWithFallback([
      {
        provider: "ollama",
        validationRetries: 1,
        generate: async () => ({ answer: ++calls === 1 ? "not-an-option" : "valid-option" }),
      },
    ], (value) => {
      const answer = (value as { answer?: string }).answer;
      if (answer !== "valid-option") throw new Error("INVALID_ANSWER");
      return answer;
    });

    expect(calls).toBe(2);
    expect(result).toEqual({ provider: "ollama", result: "valid-option" });
  });

  it("stops instead of repeating a slow inference for a question-count-only failure", async () => {
    let calls = 0;
    await expect(generateWithFallback([{
      provider: "ollama",
      validationRetries: 1,
      generate: async () => { calls += 1; return { count: 1 }; },
      stopRetryOnValidationError: (error) => error instanceof Error && error.message === "INSUFFICIENT_GENERATED_QUESTIONS",
    }], (value) => {
      if ((value as { count: number }).count < 4) throw new Error("INSUFFICIENT_GENERATED_QUESTIONS");
      return value;
    })).rejects.toThrow("INSUFFICIENT_GENERATED_QUESTIONS");
    expect(calls).toBe(1);
  });
});
