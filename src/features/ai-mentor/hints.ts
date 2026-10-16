import type { MentorHint } from "@/types/domain";
import { retrieveConceptNotes } from "@/features/rag/retrieve-concept";

export interface MentorResponse {
  retrievedKnowledge: MentorHint[];
  heuristicSuggestion: MentorHint;
  generatedExplanationAvailable: false;
}

export function buildMentorHint(query: string, conceptId?: string): MentorResponse {
  const retrieved = retrieveConceptNotes(query, 2);
  const relatedConceptIds = retrieved.map(({ note }) => note.id);
  if (conceptId && !relatedConceptIds.includes(conceptId)) relatedConceptIds.push(conceptId);

  const heuristicText = query.toLowerCase().includes("loop") || query.toLowerCase().includes("repeat")
    ? "Trace one iteration at a time. Write down the counter before the condition, then after the update."
    : query.toLowerCase().includes("array") || query.toLowerCase().includes("index")
      ? "Check the first and last valid index. Arrays start at index 0, so compare each index with the array length."
      : "Try a small input by hand, then trace each value change in order. This can reveal the first step where your expectation differs from the code.";

  return {
    retrievedKnowledge: retrieved.map(({ note }) => ({ source: "retrieved-knowledge", title: note.title, text: note.excerpt, relatedConceptIds: [note.id] })),
    heuristicSuggestion: { source: "heuristic", title: "A way to investigate", text: heuristicText, relatedConceptIds },
    generatedExplanationAvailable: false,
  };
}
