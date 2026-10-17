import type { GeneratedQuestion } from "./contracts";

export interface ScoredResponse {
  questionId: string;
  response: string;
  correct: boolean;
  topic: string;
  difficulty: GeneratedQuestion["difficulty"];
  conceptId: string | null;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function scoreQuestions(questions: readonly GeneratedQuestion[], answers: Readonly<Record<string, string>>): ScoredResponse[] {
  return questions.map((question) => {
    const response = (answers[question.id] ?? "").trim();
    return {
      questionId: question.id,
      response,
      correct: normalize(response) === normalize(question.correctAnswer),
      topic: question.topic,
      difficulty: question.difficulty,
      conceptId: question.conceptId,
    };
  });
}
