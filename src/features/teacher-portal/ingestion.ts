import { randomUUID } from "node:crypto";
import { sourceChunkSchema, type SourceChunk } from "./contracts";

const MAX_TEXT_CHUNK_LENGTH = 6000;

function splitLongBlock(block: string): string[] {
  const pieces: string[] = [];
  let remaining = block.trim();

  while (remaining.length > MAX_TEXT_CHUNK_LENGTH) {
    let boundary = remaining.lastIndexOf(" ", MAX_TEXT_CHUNK_LENGTH);
    if (boundary < 20) boundary = MAX_TEXT_CHUNK_LENGTH;
    pieces.push(remaining.slice(0, boundary).trim());
    remaining = remaining.slice(boundary).trim();
  }

  if (remaining.length >= 20) {
    pieces.push(remaining);
  } else if (remaining && pieces.length > 0) {
    pieces[pieces.length - 1] = `${pieces[pieces.length - 1]} ${remaining}`.trim();
  }

  return pieces.filter((piece) => piece.length >= 20);
}

export function chunkText(documentId: string, documentName: string, text: string, topic?: string): SourceChunk[] {
  const paragraphs = text.replace(/\r/g, "").split(/\n\s*\n/).map((part) => part.trim()).filter((part) => part.length >= 20);
  const pieces = paragraphs.length > 0 ? paragraphs : text.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter((part) => part.length >= 20);
  return pieces.flatMap((piece) => splitLongBlock(piece)).flatMap((content, index) => {
    const chunk = {
      chunkId: `${documentId}-${index + 1}`,
      documentId,
      documentName,
      content,
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
