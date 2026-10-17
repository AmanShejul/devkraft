import { describe, expect, it } from "vitest";
import { z } from "zod";
import { generateOllamaJson } from "@/lib/ai/ollama";

const enabled = process.env.RUN_OLLAMA_LIVE_TESTS === "1";
const diagnosticSource = "Breadth-first search explores a graph level by level. It uses a queue to visit each vertex's neighbors before moving to the next depth.";

describe.skipIf(!enabled)("live Ollama generation diagnostic", () => {
  it("generates and validates one question from hardcoded extracted-text-shaped input", async () => {
    const sourceChunkId = "ollama-diagnostic-bfs";
    const result = await generateOllamaJson([
      "Create one beginner-level multiple-choice question from the source text.",
      `Use sourceChunkId exactly: ${sourceChunkId}.`,
      "The correctAnswer must exactly match one option. Return one JSON object only.",
      `Source text: ${diagnosticSource}`,
    ].join("\n"), {
      type: "object",
      additionalProperties: false,
      required: ["prompt", "options", "correctAnswer", "explanation", "sourceChunkId"],
      properties: {
        prompt: { type: "string", minLength: 10 },
        options: { type: "array", items: { type: "string", minLength: 1 }, minItems: 2, maxItems: 4 },
        correctAnswer: { type: "string", minLength: 1 },
        explanation: { type: "string", minLength: 10 },
        sourceChunkId: { type: "string" },
      },
    });

    const question = z.object({
      prompt: z.string().min(10),
      options: z.array(z.string().min(1)).min(2).max(4),
      correctAnswer: z.string().min(1),
      explanation: z.string().min(10),
      sourceChunkId: z.string(),
    }).strict().parse(result);

    expect(question.sourceChunkId).toBe(sourceChunkId);
    expect(question.options).toContain(question.correctAnswer);
    expect(diagnosticSource.toLowerCase()).toContain("breadth-first search");
    console.info(`[ollama-diagnostic] ${JSON.stringify(question)}`);
  }, 150_000);
});