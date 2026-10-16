import type { LikelyMistakeExplanation, MentorHint } from "@/types/domain";

export interface MentorProvider {
  createHint(input: { question: string; relevantNotes: string[] }): Promise<MentorHint>;
  explainLikelyMistake(input: { sourceCode: string; expectedBehavior: string; observedBehavior: string }): Promise<LikelyMistakeExplanation>;
}
