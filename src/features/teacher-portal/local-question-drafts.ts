import type { DraftQuestion, QuestionDifficulty } from "./question-drafts";

interface CandidateSentence {
  text: string;
  terms: string[];
}

const fillerWords = new Set([
  "a", "about", "after", "again", "also", "an", "and", "are", "as", "at", "be", "because", "been",
  "before", "being", "but", "by", "can", "could", "do", "does", "each", "for", "from", "get", "give",
  "has", "have", "how", "if", "in", "into", "is", "it", "its", "may", "more", "most", "of", "on",
  "or", "our", "over", "should", "some", "such", "than", "that", "the", "their", "them", "there",
  "these", "they", "this", "those", "through", "to", "under", "use", "used", "using", "was", "we",
  "were", "what", "when", "where", "which", "while", "who", "will", "with", "within", "would", "you",
]);
const genericTerms = new Set(["example", "following", "information", "method", "process", "thing", "things"]);

function candidateTerms(sentence: string): string[] {
  const capitalizedPhrases = sentence.match(/\b(?:[A-Z][A-Za-z0-9-]*)(?:\s+[A-Z][A-Za-z0-9-]*)+\b/g) ?? [];
  const numbers = sentence.match(/\b\d+(?:\.\d+)?%?\b/g) ?? [];
  const words = (sentence.match(/\b[A-Za-z][A-Za-z0-9-]*\b/g) ?? [])
    .filter((word) => word.length >= 4 && !fillerWords.has(word.toLowerCase()) && !genericTerms.has(word.toLowerCase()))
    .filter((word) => !/^(?:the|this|that|these|those)$/i.test(word));
  const nounCandidates = words.filter((word) => /(?:tion|sion|ment|ness|ity|er|or|ing|array|value|loop|function|class|object|variable|number|data|table|key|memory|database|python|javascript)$/i.test(word)
    || /^[A-Z][a-z]/.test(word));
  return [...new Set([...capitalizedPhrases, ...numbers, ...nounCandidates])];
}

function candidateScore(term: string): number {
  if (/^\d/.test(term)) return 4;
  if (/\s/.test(term) && /^[A-Z]/.test(term)) return 5;
  if (/^[A-Z]{2,}$/.test(term)) return 4;
  if (/^[A-Z]/.test(term)) return 2;
  return 1;
}

function sentenceCandidates(notes: string): CandidateSentence[] {
  return notes
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((text) => text.trim())
    .filter((text) => text.length >= 35 && (text.match(/[A-Za-z]/g) ?? []).length >= 20)
    .map((text) => ({ text, terms: candidateTerms(text) }))
    .filter((item) => item.terms.length > 0 && !/^(?:hello|hi|welcome|thank you|thanks|please note)\b/i.test(item.text));
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: readonly T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}

function blankSentence(sentence: string, term: string): string {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return sentence.replace(new RegExp(escaped, "i"), "________");
}

function makeQuestion(
  id: string,
  prompt: string,
  answer: string,
  options: string[],
  source: string,
  difficulty: QuestionDifficulty,
  explanation: string,
): DraftQuestion | null {
  const distinctOptions = new Set(options.map((option) => option.toLowerCase()));
  if (distinctOptions.size !== options.length
    || (options.length > 0 && options.filter((option) => option.toLowerCase() === answer.toLowerCase()).length !== 1)) return null;
  return {
    id,
    prompt,
    answer,
    ...(options.length > 0 ? { options } : {}),
    source,
    difficulty,
    explanation,
    reviewStatus: "draft",
    generationStatus: "needs-review",
  };
}

export function draftQuestionsFromNotes(notes: string, count: number, level: QuestionDifficulty): DraftQuestion[] {
  if (!Number.isInteger(count) || count < 1 || count > 20 || !["foundation", "intermediate", "advanced"].includes(level)) return [];
  const sentences = sentenceCandidates(notes);
  if (sentences.length === 0) return [];
  const termPool = [...new Set(sentences.flatMap((sentence) => sentence.terms))]
    .sort((left, right) => candidateScore(right) - candidateScore(left) || left.localeCompare(right));
  const random = seededRandom(hashSeed(`${notes}\u0000${count}\u0000${level}`));
  const seenPrompts = new Set<string>();
  const questions: DraftQuestion[] = [];

  for (let index = 0; index < sentences.length && questions.length < count; index += 1) {
    const sentence = sentences[index];
    const answer = [...sentence.terms].sort((left, right) => candidateScore(right) - candidateScore(left) || left.localeCompare(right))[0];
    const format = index % 5;
    let question: DraftQuestion | null = null;

    if (format === 0 || format === 4) {
      question = makeQuestion(
        `local-${hashSeed(notes).toString(36)}-${index + 1}`,
        `Complete the statement: ${blankSentence(sentence.text, answer)}`,
        answer,
        [],
        sentence.text,
        level,
        `The notes state: ${sentence.text}`,
      );
    } else if (format === 2) {
      const distractor = termPool.find((term) => term.toLowerCase() !== answer.toLowerCase());
      const statement = distractor ? sentence.text.replace(new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), distractor) : `The notes do not describe ${answer}.`;
      const correct = statement === sentence.text;
      question = makeQuestion(
        `local-${hashSeed(notes).toString(36)}-${index + 1}`,
        `True or False: ${statement}`,
        correct ? "True" : "False",
        ["True", "False"],
        sentence.text,
        level,
        correct ? `This matches the notes: ${sentence.text}` : `The notes instead state: ${sentence.text}`,
      );
    } else {
      const distractors = seededShuffle(termPool.filter((term) => term.toLowerCase() !== answer.toLowerCase()), random)
        .slice(0, 3);
      if (distractors.length === 3) {
        question = makeQuestion(
          `local-${hashSeed(notes).toString(36)}-${index + 1}`,
          `According to the notes, which term completes this statement? ${blankSentence(sentence.text, answer)}`,
          answer,
          seededShuffle([answer, ...distractors], random),
          sentence.text,
          level,
          `The notes state: ${sentence.text}`,
        );
      }
    }

    if (!question) continue;
    const normalizedPrompt = question.prompt.toLowerCase().replace(/\W+/g, " ").trim();
    if (seenPrompts.has(normalizedPrompt)) continue;
    seenPrompts.add(normalizedPrompt);
    questions.push(question);
  }

  return questions;
}
