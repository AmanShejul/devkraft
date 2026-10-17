import { describe, expect, it } from "vitest";
import { chunkText } from "@/features/teacher-portal/ingestion";
import { generatedQuestionListSchema, visualExplanationSchema } from "@/features/teacher-portal/contracts";
import { retrieveRelevantChunks } from "@/features/teacher-portal/retrieval";
import { scoreQuestions } from "@/features/teacher-portal/scoring";

describe("teacher document RAG", () => {
  const chunks = [
    ...chunkText("doc-a", "loops.txt", "A loop repeats a block while its condition remains true. A for loop commonly has initialization, condition, and update sections.", "Loops"),
    ...chunkText("doc-b", "arrays.txt", "An array stores an ordered collection of values. Indexes identify positions and usually start at zero.", "Arrays"),
  ];

  it("chunks readable source into meaningful evidence", () => {
    expect(chunks.length).toBe(2);
    expect(chunks[0].documentId).toBe("doc-a");
    expect(chunks[0].page).toBeNull();
  });

  it("preserves long pasted material across bounded chunks", () => {
    const firstMarker = "START_OF_LONG_NOTES";
    const lastMarker = "END_OF_LONG_NOTES";
    const longText = `${firstMarker} ${"A useful sentence about algorithms and data structures. ".repeat(180)} ${lastMarker}`;
    const longChunks = chunkText("doc-long", "long.txt", longText);

    expect(longChunks.length).toBeGreaterThan(1);
    expect(longChunks.every((chunk) => chunk.content.length <= 12000)).toBe(true);
    expect(longChunks.map((chunk) => chunk.content).join(" ")).toContain(firstMarker);
    expect(longChunks.map((chunk) => chunk.content).join(" ")).toContain(lastMarker);
  });

  it("retrieves only authorized document chunks and ranks topic overlap", () => {
    const result = retrieveRelevantChunks(chunks, { documentIds: ["doc-a"], topic: "Loops", objectives: ["condition update"], limit: 2 });
    expect(result).toHaveLength(1);
    expect(result[0].documentId).toBe("doc-a");
    expect(result[0].content).toContain("condition");
  });

  it("samples relevant evidence across long documents instead of only the opening sections", () => {
    const longDocument = Array.from({ length: 40 }, (_, index) => ({
      chunkId: `doc-long-${index}`,
      documentId: "doc-long",
      documentName: "long-notes.txt",
      content: `Database topic section ${index} explains tables and records in detail.`,
      page: null,
      topic: null,
      concepts: [],
    }));

    const result = retrieveRelevantChunks(longDocument, { documentIds: ["doc-long"], topic: "database", limit: 8 });
    const positions = result.map((chunk) => longDocument.findIndex((candidate) => candidate.chunkId === chunk.chunkId));

    expect(result).toHaveLength(8);
    expect(positions[0]).toBeLessThan(5);
    expect(positions.at(-1)).toBeGreaterThan(34);
    expect(new Set(positions.map((position) => Math.floor(position / 5))).size).toBeGreaterThanOrEqual(7);
  });

  it("does not return unrelated private-document evidence", () => {
    expect(retrieveRelevantChunks(chunks, { documentIds: ["doc-b"], topic: "Loops" })).toHaveLength(0);
  });
});

describe("grounded question contracts", () => {
  const valid = {
    id: "q-1", type: "mcq", prompt: "What does a loop repeat?", options: ["A block", "A file"], correctAnswer: "A block",
    explanation: "The notes define a loop as repeating a block.", subject: "Programming", topic: "Loops", conceptId: "loops", difficulty: "foundation",
    source: { documentId: "doc-a", documentName: "loops.txt", page: null, excerpt: "A loop repeats a block." }, generationStatus: "grounded", reviewStatus: "draft",
  } as const;

  it("accepts traceable MCQs", () => expect(generatedQuestionListSchema.safeParse([valid]).success).toBe(true));
  it("rejects an answer that is not one of the options", () => expect(generatedQuestionListSchema.safeParse([{ ...valid, correctAnswer: "A function" }]).success).toBe(false));
  it("rejects malformed source references", () => expect(generatedQuestionListSchema.safeParse([{ ...valid, source: { ...valid.source, excerpt: "" } }]).success).toBe(false));

  it("accepts a connected visual explanation", () => expect(visualExplanationSchema.safeParse({
    title: "How loops work", summary: "A loop checks a condition before repeating a block.",
    nodes: [{ id: "condition", label: "Condition", description: "Controls whether the loop continues.", }, { id: "block", label: "Repeated block", description: "Runs while the condition is true." }],
    edges: [{ from: "condition", to: "block", label: "allows" }],
  }).success).toBe(true));

  it("rejects visual edges that point outside the explanation", () => expect(visualExplanationSchema.safeParse({
    title: "How loops work", summary: "A loop checks a condition.",
    nodes: [{ id: "condition", label: "Condition", description: "Controls whether the loop continues." }, { id: "block", label: "Repeated block", description: "Runs while the condition is true." }],
    edges: [{ from: "condition", to: "missing", label: "allows" }],
  }).success).toBe(false));
});

describe("server-side quiz scoring", () => {
  const question = {
    id: "q-1", type: "mcq" as const, prompt: "What repeats?", options: ["A block", "A file"], correctAnswer: "A block", explanation: "The block repeats.",
    subject: "Programming", topic: "Loops", conceptId: "loops", difficulty: "foundation" as const,
    source: { documentId: "doc-a", documentName: "loops.txt", page: null, excerpt: "A loop repeats a block." }, generationStatus: "grounded" as const, reviewStatus: "published" as const,
  };

  it("scores from the stored answer key, not a client-supplied correctness flag", () => {
    expect(scoreQuestions([question], { "q-1": "A block" })[0].correct).toBe(true);
    expect(scoreQuestions([question], { "q-1": "A file" })[0].correct).toBe(false);
  });
});
