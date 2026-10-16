import type { AssessmentAnswer, AssessmentQuestion, AssessmentResult, ConceptMastery } from "@/types/domain";
import { LEARNING_CONFIG } from "@/config/learning";
import { updateConceptMastery } from "@/features/adaptive-learning/bkt";

interface BankQuestion extends AssessmentQuestion {
  correctChoiceId: string;
  explanation: string;
}

const QUESTION_BANK: readonly BankQuestion[] = [
  {
    id: "variables-1",
    prompt: "What value does `score` hold after this code runs?\n\nlet score = 2;\nscore = score + 3;",
    choices: [{ id: "a", text: "2" }, { id: "b", text: "3" }, { id: "c", text: "5" }, { id: "d", text: "23" }],
    conceptId: "variables",
    correctChoiceId: "c",
    explanation: "The current value is 2, then 3 is added to it, so score becomes 5.",
  },
  {
    id: "conditionals-1",
    prompt: "When will the message `Ready` be printed?\n\nif (lives > 0) {\n  console.log('Ready');\n}",
    choices: [{ id: "a", text: "When lives is greater than 0" }, { id: "b", text: "Only when lives is 0" }, { id: "c", text: "Every time, regardless of lives" }, { id: "d", text: "When lives is less than 0" }],
    conceptId: "conditionals",
    correctChoiceId: "a",
    explanation: "The body runs only when the condition `lives > 0` is true.",
  },
  {
    id: "loops-1",
    prompt: "How many times does this loop print a number?\n\nfor (let i = 0; i < 4; i++) {\n  console.log(i);\n}",
    choices: [{ id: "a", text: "3 times" }, { id: "b", text: "4 times" }, { id: "c", text: "5 times" }, { id: "d", text: "It never runs" }],
    conceptId: "loops",
    correctChoiceId: "b",
    explanation: "The loop visits i = 0, 1, 2, and 3. It stops before i reaches 4.",
  },
];

export function getPublicQuestions(): AssessmentQuestion[] {
  return QUESTION_BANK.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    choices: question.choices,
    conceptId: question.conceptId,
  }));
}

export function scoreAssessment(
  answers: readonly AssessmentAnswer[],
  currentMastery: readonly ConceptMastery[] = [],
  now = new Date(),
): AssessmentResult {
  if (!Array.isArray(answers) || answers.length !== QUESTION_BANK.length) {
    throw new TypeError(`Submit exactly ${QUESTION_BANK.length} answers.`);
  }

  const submittedIds = answers.map((answer) => answer.questionId);
  if (new Set(submittedIds).size !== submittedIds.length) throw new TypeError("Each question must be answered once.");

  const answerById = new Map(answers.map((answer) => [answer.questionId, answer.choiceId]));
  const masteryByConcept = new Map(currentMastery.map((item) => [item.conceptId, item]));
  const results = QUESTION_BANK.map((question) => {
    const choiceId = answerById.get(question.id);
    if (!choiceId || !question.choices.some((choice) => choice.id === choiceId)) {
      throw new TypeError(`A valid choice is required for question ${question.id}.`);
    }
    const previous = masteryByConcept.get(question.conceptId) ?? {
      conceptId: question.conceptId,
      probability: LEARNING_CONFIG.bkt.initialMastery,
    };
    masteryByConcept.set(
      question.conceptId,
      updateConceptMastery(previous, choiceId === question.correctChoiceId, LEARNING_CONFIG.bkt, now),
    );
    return {
      questionId: question.id,
      correct: choiceId === question.correctChoiceId,
      correctChoiceId: question.correctChoiceId,
      explanation: question.explanation,
    };
  });

  return {
    attemptId: `demo-${now.getTime()}`,
    score: results.filter((result) => result.correct).length,
    total: results.length,
    completedAt: now.toISOString(),
    persistence: "demo",
    answers: results,
    mastery: [...masteryByConcept.values()],
  };
}
