import { randomUUID } from "node:crypto";
import { sourceChunkSchema, type SourceChunk } from "./contracts";

export function chunkText(documentId: string, documentName: string, text: string, topic?: string): SourceChunk[] {
  const paragraphs = text.replace(/\r/g, "").split(/\n\s*\n/).map((part) => part.trim()).filter((part) => part.length >= 20);
  const pieces = paragraphs.length > 0 ? paragraphs : text.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter((part) => part.length >= 20);
  return pieces.flatMap((content, index) => {
    const chunk = {
      chunkId: `${documentId}-${index + 1}`,
      documentId,
      documentName,
      content: content.slice(0, 12000),
      page: null,
      topic: topic?.trim() || null,
      concepts: [],
    };
    const result = sourceChunkSchema.safeParse(chunk);
    return result.success ? [result.data] : [];
  });
}

export function makeDocumentId(): string {
  return randomUUID();
}
