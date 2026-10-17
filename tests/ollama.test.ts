import { afterEach, describe, expect, it, vi } from "vitest";
import { generateWithFallback } from "@/features/teacher-portal/generation-provider";
import { generateOllamaJson } from "@/lib/ai/ollama";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("local Ollama JSON generation", () => {
  it("sends the prompt and JSON schema to the configured local model", async () => {
    const mockFetch = vi.fn(async () => Response.json({ message: { content: "{\"questions\":[]}" } }));
    vi.stubGlobal("fetch", mockFetch);
    vi.stubEnv("OLLAMA_BASE_URL", "http://localhost:11434/");
    vi.stubEnv("OLLAMA_MODEL", "llama3.2:latest");
    const schema = { type: "object", required: ["questions"] };

    await expect(generateOllamaJson("Make questions from these notes", schema)).resolves.toEqual({ questions: [] });
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:11434/api/chat");
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: "llama3.2:latest",
      format: schema,
      stream: false,
      messages: [{ role: "system" }, { role: "user", content: "Make questions from these notes" }],
    });
  });

  it("reports unavailable local Ollama without leaking network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));

    await expect(generateOllamaJson("prompt", { type: "object" })).rejects.toThrow("OLLAMA_UNREACHABLE");
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
});