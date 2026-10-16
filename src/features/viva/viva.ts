import { LEARNING_CONFIG } from "@/config/learning";
import { updateConceptMastery } from "@/features/adaptive-learning/bkt";
import type { ConceptMastery, VivaEvaluation, VivaQuestion } from "@/types/domain";

export interface VivaAnswer {
  questionId: string;
  answer: string;
}

interface VivaQuestionContext {
  condition: string;
  returnExpression: string;
  collectionName: string;
  inputName: string;
}

export interface VivaMasteryUpdate {
  understandingScore: number;
  mastery: ConceptMastery[];
  masteryCounted: boolean;
}

function captureFirst(sourceCode: string, patterns: readonly RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = sourceCode.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function getQuestionContext(sourceCode: string): VivaQuestionContext | null {
  const condition = captureFirst(sourceCode, [
    /\bfor\s*\([^;]*;\s*([^;]+);/,
    /\bwhile\s*\(([^)]+)\)/,
    /\bwhile\s+([^:\n]+):/,
  ]);
  const returnExpression = captureFirst(sourceCode, [/\breturn\s+([^;\n}]+)/]);
  const inputName = captureFirst(sourceCode, [
    /\bfunction\s+[A-Za-z_$][\w$]*\s*\(\s*([A-Za-z_$][\w$]*)/,
    /\bdef\s+[A-Za-z_]\w*\s*\(\s*([A-Za-z_]\w*)/,
    /\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*\(\s*([A-Za-z_$][\w$]*)/,
    /\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*([A-Za-z_$][\w$]*)\s*=>/,
  ]);
  const returnedCollection = returnExpression?.match(/^[A-Za-z_$][\w$]*/)?.[0];
  const collectionName = returnedCollection ?? captureFirst(sourceCode, [
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\[\s*\]/,
    /^\s*([A-Za-z_]\w*)\s*=\s*\[\s*\]/m,
  ]);

  if (!condition || !returnExpression || !collectionName || !inputName) return null;
  return { condition, returnExpression, collectionName, inputName };
}

export function generateVivaQuestions(sourceCode: string): VivaQuestion[] {
  const context = getQuestionContext(sourceCode);
  if (!context) return [];

  return [
    {
      id: "loop-condition",
      prompt: `Your code checks \`${context.condition}\` in its loop. What does that condition test before each iteration, and when does the loop stop?`,
      conceptId: "loops",
    },
    {
      id: "return-path",
      prompt: `When \`${context.inputName}\` is 1, what does the \`return ${context.returnExpression}\` path return?`,
      conceptId: "loops",
    },
    {
      id: "accumulator-role",
      prompt: `What does your \`${context.collectionName}\` collection hold when the function finishes?`,
      conceptId: "loops",
    },
  ];
}

export function prepareVivaForSubmit(sourceCode: string): { questions: VivaQuestion[]; message: string } {
  const questions = generateVivaQuestions(sourceCode);
  return {
    questions,
    message: questions.length === 3
      ? ""
      : "Could not identify the loop, return path, and collection in your code to generate explanation questions.",
  };
}

function normalizeAnswer(answer: string): string {
  return answer.toLowerCase().replace(/\bone\b/g, "1").replace(/\bzero\b/g, "0").replace(/\s+/g, " ").trim();
}

function isLoopBoundExplained(answer: string, condition: string): boolean {
  const normalized = normalizeAnswer(answer);
  const conditionText = normalizeAnswer(condition);
  const namesCondition = normalized.includes(conditionText) || /\b(?:condition|loop|counter|cursor|number)\b/.test(normalized);
  const explainsInclusiveBound = /(?:at least 1|greater than or equal(?: to)? 1|>=\s*1|down to 1|until .{0,30}(?:below|less than) 1|stop(?:s)? .{0,30}(?:below|less than) 1|drop(?:s)? below 1|reach(?:es)? 0|become(?:s)? 0|stop(?:s)? .{0,30}\b0\b)/.test(normalized);
  const explainsLoopBehavior = /\b(?:loop|repeat|iterate|continue|stops?|ends?|until|while|condition)\b/.test(normalized);
  const contradictsBound = /(?:stop|end|finish)(?:s)? .{0,20}(?:at|when it reaches?) 1\b/.test(normalized);
  return namesCondition && explainsInclusiveBound && explainsLoopBehavior && !contradictsBound;
}

function isReturnPathExplained(answer: string): boolean {
  const normalized = normalizeAnswer(answer);
  const describesReturn = /\b(?:return|returns|produce|produces|yield|yields|contain|contains|has)\b/.test(normalized);
  const describesCollection = /\b(?:array|list|collection|sequence)\b/.test(normalized);
  const describesOnlyOne = /\b(?:only|single|one|1)\b/.test(normalized)
    && /\b(?:item|element|value|number)\b/.test(normalized);
  const hasOne = /\b1\b/.test(normalized);
  const isExactArray = /\[\s*1\s*\]/.test(normalized);
  return describesReturn && describesCollection && ((describesOnlyOne && hasOne) || isExactArray);
}

function isAccumulatorRoleExplained(answer: string, collectionName: string): boolean {
  const normalized = normalizeAnswer(answer);
  const namesCollection = normalized.includes(collectionName.toLowerCase())
    || /\b(?:array|list|collection)\b/.test(normalized);
  const describesRole = /\b(?:store|hold|contain|collect|accumulate|append)\w*\b/.test(normalized);
  const describesSequence = /\b(?:countdown|count down|from|down to|through|each|every|1)\b/.test(normalized);
  return namesCollection && describesRole && describesSequence;
}

export function evaluateVivaAnswers(sourceCode: string, answers: readonly VivaAnswer[]): VivaEvaluation[] {
  const context = getQuestionContext(sourceCode);
  if (!context) throw new TypeError("Could not identify the loop, return path, and collection in the submitted code.");

  const questions = generateVivaQuestions(sourceCode);
  const answerById = new Map(answers.map((item) => [item.questionId, normalizeAnswer(item.answer)]));
  const expectations: Record<string, { correct: (answer: string) => boolean; feedback: (passed: boolean) => string }> = {
    "loop-condition": {
      correct: (answer) => isLoopBoundExplained(answer, context.condition),
      feedback: (passed) => passed
        ? `Your loop checks \`${context.condition}\` before each iteration and stops when that condition is false.`
        : `Your code checks \`${context.condition}\` before each iteration; explain how that bound determines when it stops.`,
    },
    "return-path": {
      correct: isReturnPathExplained,
      feedback: (passed) => passed
        ? `The code executes \`return ${context.returnExpression}\`; with \`${context.inputName}\` equal to 1, the collection contains the single value 1.`
        : `The return path executes \`return ${context.returnExpression}\`. With \`${context.inputName}\` equal to 1, explain why it produces the one-item result [1].`,
    },
    "accumulator-role": {
      correct: (answer) => isAccumulatorRoleExplained(answer, context.collectionName),
      feedback: (passed) => passed
        ? `Your \`${context.collectionName}\` collection accumulates the countdown values and is returned by the function.`
        : `Your code uses \`${context.collectionName}\` as the collection returned by \`${context.returnExpression}\`; describe which countdown values it holds.`,
    },
  };

  return questions.map((question) => {
    const answer = answerById.get(question.id) ?? "";
    const expectation = expectations[question.id];
    const passed = expectation.correct(answer);
    return {
      questionId: question.id,
      score: passed ? 1 : 0,
      feedback: expectation.feedback(passed),
      evaluatedBy: "heuristic",
    };
  });
}

export function updateVivaMastery(
  currentMastery: readonly ConceptMastery[],
  evaluations: readonly VivaEvaluation[],
  now = new Date(),
  alreadyCounted = false,
): VivaMasteryUpdate {
  if (evaluations.length === 0) throw new TypeError("At least one viva evaluation is required.");
  const understandingScore = evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / evaluations.length;
  if (alreadyCounted) {
    return { understandingScore, mastery: [...currentMastery], masteryCounted: false };
  }
  const previous = currentMastery.find((item) => item.conceptId === "loops") ?? {
    conceptId: "loops",
    probability: LEARNING_CONFIG.bkt.initialMastery,
  };
  const updated = updateConceptMastery(previous, understandingScore >= 0.6, LEARNING_CONFIG.bkt, now);
  return {
    understandingScore,
    mastery: [...currentMastery.filter((item) => item.conceptId !== "loops"), updated],
    masteryCounted: true,
  };
}
