import { z } from "zod";

export const questionDifficultySchema = z.enum(["foundation", "intermediate", "advanced"]);
export const questionTypeSchema = z.enum(["mcq", "short-answer"]);
export const questionStatusSchema = z.enum(["draft", "reviewed", "published", "archived"]);

export const sourceReferenceSchema = z.object({
  documentId: z.string().min(1),
  documentName: z.string().min(1),
  page: z.number().int().positive().nullable(),
  excerpt: z.string().min(1).max(2000),
}).strict();

export const generatedQuestionSchema = z.object({
  id: z.string().min(1),
  type: questionTypeSchema.default("mcq"),
  prompt: z.string().min(10).max(4000),
  options: z.array(z.string().min(1).max(500)).min(2).max(6).optional(),
  correctAnswer: z.string().min(1).max(500),
  explanation: z.string().min(1).max(2000),
  subject: z.string().min(1).max(120),
  topic: z.string().min(1).max(120),
  conceptId: z.string().min(1).max(120).nullable().default(null),
  difficulty: questionDifficultySchema,
  source: sourceReferenceSchema,
  generationStatus: z.enum(["grounded", "needs-review"]).default("grounded"),
  reviewStatus: z.enum(["draft", "reviewed", "published"]).default("draft"),
}).strict().superRefine((question, context) => {
  if (question.type === "mcq" && (!question.options || !question.options.includes(question.correctAnswer))) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["correctAnswer"], message: "MCQ answer must match one of the options." });
  }
});

export const sourceChunkSchema = z.object({
  chunkId: z.string().min(1),
  documentId: z.string().min(1),
  documentName: z.string().min(1),
  content: z.string().min(20).max(12000),
  page: z.number().int().positive().nullable(),
  topic: z.string().max(120).nullable(),
  concepts: z.array(z.string().min(1).max(120)).max(20),
}).strict();

export const generatedQuestionListSchema = z.array(generatedQuestionSchema).min(1).max(20);

const visualNodeSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  description: z.string().min(1).max(400),
  sourceChunkId: z.string().min(1),
}).strict();

const visualEdgeSchema = z.object({
  from: z.string().min(1).max(80),
  to: z.string().min(1).max(80),
  label: z.string().max(120),
}).strict();

export const visualExplanationSchema = z.object({
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(600),
  nodes: z.array(visualNodeSchema.omit({ sourceChunkId: true })).min(2).max(8),
  edges: z.array(visualEdgeSchema).max(12),
}).strict().superRefine((visual, context) => {
  const ids = new Set(visual.nodes.map((node) => node.id));
  if (new Set(ids).size !== visual.nodes.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["nodes"], message: "Visual node IDs must be unique." });
  visual.edges.forEach((edge, index) => {
    if (!ids.has(edge.from) || !ids.has(edge.to)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["edges", index], message: "Visual edges must reference existing nodes." });
  });
});

const generatedVisualExplanationSchema = z.object({
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(600),
  nodes: z.array(visualNodeSchema).min(2).max(8),
  edges: z.array(visualEdgeSchema).max(12),
}).strict();

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;
export type SourceChunk = z.infer<typeof sourceChunkSchema>;
export type QuestionDifficulty = z.infer<typeof questionDifficultySchema>;
export type QuestionType = z.infer<typeof questionTypeSchema>;
export type QuestionStatus = z.infer<typeof questionStatusSchema>;
export type VisualExplanation = z.infer<typeof visualExplanationSchema>;

export interface TeacherDocument {
  id: string;
  ownerId: string;
  name: string;
  mimeType: string;
  status: "processing" | "ready" | "failed";
  failureReason?: string;
  createdAt: string;
  chunks: SourceChunk[];
}

export interface TeacherQuizSet {
  id: string;
  ownerId: string;
  title: string;
  subject: string;
  topic: string;
  instructions: string;
  status: QuestionStatus;
  createdAt: string;
  publishedAt?: string;
  availableFrom?: string;
  dueAt?: string;
  visualExplanation?: VisualExplanation | null;
  questions: GeneratedQuestion[];
}

export { generatedVisualExplanationSchema };
