import { inflateSync } from "node:zlib";
import { sourceChunkSchema, type SourceChunk } from "./contracts";

export type PdfPageText = { page: number; text: string };

export class PdfExtractionError extends Error {
  readonly code: "PDF_MALFORMED" | "PDF_ENCRYPTED" | "PDF_UNSUPPORTED_FILTER";

  constructor(code: PdfExtractionError["code"], message: string) {
    super(message);
    this.name = "PdfExtractionError";
    this.code = code;
  }
}

type PdfObject = { body: string; bodyStart: number };

function readLiteral(source: string, start: number): { value: string; next: number } {
  let index = start + 1;
  let depth = 1;
  let value = "";
  while (index < source.length && depth > 0) {
    const character = source[index];
    if (character === "\\") {
      const next = source[index + 1] ?? "";
      const escapes: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f" };
      if (escapes[next]) {
        value += escapes[next];
        index += 2;
        continue;
      }
      if (/\d/.test(next)) {
        const octal = source.slice(index + 1).match(/^\d{1,3}/)?.[0] ?? "";
        value += String.fromCharCode(Number.parseInt(octal, 8));
        index += 1 + octal.length;
        continue;
      }
      if (next === "\r" || next === "\n") {
        index += next === "\r" && source[index + 2] === "\n" ? 3 : 2;
        continue;
      }
      value += next;
      index += 2;
      continue;
    }
    if (character === "(") {
      depth += 1;
      value += character;
    } else if (character === ")") {
      depth -= 1;
      if (depth > 0) value += character;
    } else {
      value += character;
    }
    index += 1;
  }
  return { value, next: index };
}

function readHex(source: string, start: number): { value: string; next: number } {
  const end = source.indexOf(">", start + 1);
  if (end < 0) return { value: "", next: source.length };
  const hex = source.slice(start + 1, end).replace(/\s/g, "");
  const bytes = Buffer.from(hex.length % 2 === 0 ? hex : `${hex}0`, "hex");
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let value = "";
    for (let index = 2; index + 1 < bytes.length; index += 2) value += String.fromCharCode((bytes[index] << 8) | bytes[index + 1]);
    return { value, next: end + 1 };
  }
  return { value: bytes.toString("latin1"), next: end + 1 };
}

function extractTextFromStream(stream: Buffer): string {
  const source = stream.toString("latin1");
  const output: string[] = [];
  const pending: string[] = [];
  let inTextBlock = false;
  let lineBreak = false;
  let index = 0;

  const emit = () => {
    if (pending.length === 0) return;
    if (lineBreak && output.length > 0) output.push("\n");
    output.push(pending.join(""));
    pending.length = 0;
    lineBreak = false;
  };

  while (index < source.length) {
    if (source[index] === "%") {
      const lineEnd = source.indexOf("\n", index);
      index = lineEnd < 0 ? source.length : lineEnd + 1;
      continue;
    }
    if (source.startsWith("BT", index) && /\s|[\[\]()<>]/.test(source[index + 2] ?? "")) {
      inTextBlock = true;
      index += 2;
      continue;
    }
    if (source.startsWith("ET", index) && /\s|[\[\]()<>]/.test(source[index + 2] ?? "")) {
      emit();
      inTextBlock = false;
      index += 2;
      continue;
    }
    if (!inTextBlock) {
      index += 1;
      continue;
    }
    if (source[index] === "(") {
      const literal = readLiteral(source, index);
      pending.push(literal.value);
      index = literal.next;
      continue;
    }
    if (source[index] === "<" && source[index + 1] !== "<") {
      const hex = readHex(source, index);
      pending.push(hex.value);
      index = hex.next;
      continue;
    }
    if (source[index] === "'" || source[index] === '"') {
      emit();
      lineBreak = true;
      index += 1;
      continue;
    }
    if (/\s|[\[\]]/.test(source[index])) {
      index += 1;
      continue;
    }
    let end = index;
    while (end < source.length && !/\s|[\[\]()<>]/.test(source[end])) end += 1;
    const token = source.slice(index, end);
    if (token === "Tj" || token === "TJ") emit();
    else if (token === "Td" || token === "TD" || token === "T*") lineBreak = true;
    index = end;
  }
  emit();
  return output.join("").replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function parseObjects(bytes: Buffer): Map<number, PdfObject> {
  const source = bytes.toString("latin1");
  const objects = new Map<number, PdfObject>();
  const objectPattern = /(\d+)\s+\d+\s+obj\b/g;
  let match: RegExpExecArray | null;
  while ((match = objectPattern.exec(source))) {
    const end = source.indexOf("endobj", objectPattern.lastIndex);
    if (end < 0) continue;
    objects.set(Number(match[1]), { body: source.slice(objectPattern.lastIndex, end), bodyStart: objectPattern.lastIndex });
    objectPattern.lastIndex = end + 6;
  }
  return objects;
}

function objectStream(bytes: Buffer, object: PdfObject): Buffer {
  const source = bytes.toString("latin1");
  const streamMatch = /stream(?:\r\n|\n|\r)/.exec(object.body);
  if (!streamMatch) return Buffer.alloc(0);
  const streamStart = object.bodyStart + streamMatch.index + streamMatch[0].length;
  const streamEnd = source.indexOf("endstream", streamStart);
  if (streamEnd < 0) throw new PdfExtractionError("PDF_MALFORMED", "The PDF content stream is incomplete.");
  const raw = bytes.subarray(streamStart, streamEnd);
  const dictionary = object.body.slice(0, streamMatch.index);
  if (/\/Filter\s*\/FlateDecode\b/.test(dictionary)) {
    try { return inflateSync(raw); } catch { throw new PdfExtractionError("PDF_MALFORMED", "The PDF content stream could not be decompressed."); }
  }
  if (/\/Filter\b/.test(dictionary)) throw new PdfExtractionError("PDF_UNSUPPORTED_FILTER", "This PDF uses an unsupported compression filter.");
  return raw;
}

function contentReferences(pageBody: string): number[] {
  const match = /\/Contents\s+(\[[\s\S]*?\]|\d+\s+\d+\s+R)/.exec(pageBody);
  return match ? [...match[1].matchAll(/(\d+)\s+\d+\s+R/g)].map((item) => Number(item[1])) : [];
}

export function extractPdfPages(bytes: Uint8Array): PdfPageText[] {
  const sourceBytes = Buffer.from(bytes);
  const source = sourceBytes.toString("latin1");
  if (!source.startsWith("%PDF-")) throw new PdfExtractionError("PDF_MALFORMED", "The uploaded file is not a valid PDF.");
  if (/\/Encrypt\b/.test(source)) throw new PdfExtractionError("PDF_ENCRYPTED", "The PDF is encrypted or password-protected.");
  const objects = parseObjects(sourceBytes);
  const pages = [...objects.values()].filter((object) => /\/Type\s*\/Page(?:\s|\/|$)/.test(object.body));
  if (pages.length === 0) throw new PdfExtractionError("PDF_MALFORMED", "The PDF has no readable pages.");
  return pages.map((page, index) => {
    const text = contentReferences(page.body).map((reference) => extractTextFromStream(objectStream(sourceBytes, objects.get(reference) ?? { body: "", bodyStart: 0 }))).join("\n").trim();
    return { page: index + 1, text };
  }).filter((page) => page.text.length >= 20);
}

function splitPageText(text: string, maxLength = 6000): string[] {
  const paragraphs = text.split(/\n\s*\n/).map((part) => part.trim()).filter((part) => part.length >= 20);
  const pieces = paragraphs.length > 0 ? paragraphs : text.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter((part) => part.length >= 20);
  const result: string[] = [];
  for (const piece of pieces) {
    if (piece.length <= maxLength) {
      result.push(piece);
      continue;
    }
    for (let start = 0; start < piece.length; start += maxLength) result.push(piece.slice(start, start + maxLength).trim());
  }
  return result.filter((piece) => piece.length >= 20);
}

export function chunkPdfPages(documentId: string, documentName: string, pages: readonly PdfPageText[], topic?: string): SourceChunk[] {
  return pages.flatMap((page) => splitPageText(page.text).map((content, index) => sourceChunkSchema.parse({
    chunkId: `${documentId}-p${page.page}-${index + 1}`,
    documentId,
    documentName,
    content: content.slice(0, 12000),
    page: page.page,
    topic: topic?.trim() || null,
    concepts: [],
  })));
}
