import { describe, expect, it } from "vitest";
import { chunkPdfPages, extractPdfPages, PdfExtractionError } from "@/features/teacher-portal/pdf-extraction";

function makePdf(pages: string[]): Uint8Array {
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    `2 0 obj\n<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>\nendobj\n`,
    ...pages.flatMap((text, index) => {
      const pageNumber = 3 + index * 2;
      const streamNumber = pageNumber + 1;
      const stream = `BT\n/F1 12 Tf\n72 700 Td\n(${text}) Tj\nET\n`;
      return [
        `${pageNumber} 0 obj\n<< /Type /Page /Parent 2 0 R /Contents ${streamNumber} 0 R >>\nendobj\n`,
        `${streamNumber} 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream\nendobj\n`,
      ];
    }),
  ];
  return Buffer.from(`%PDF-1.4\n${objects.join("")}%%EOF\n`, "latin1");
}

describe("local PDF extraction", () => {
  it("extracts page-aware text from a text-based PDF", () => {
    const pages = extractPdfPages(makePdf([
      "A relational database organizes records into tables and connects them with keys.",
      "Indexes improve lookup speed by creating an efficient access path for a table.",
    ]));

    expect(pages).toEqual([
      { page: 1, text: "A relational database organizes records into tables and connects them with keys." },
      { page: 2, text: "Indexes improve lookup speed by creating an efficient access path for a table." },
    ]);
  });

  it("splits large page text into bounded chunks while preserving page references", () => {
    const text = Array.from({ length: 800 }, (_, index) => `Concept ${index} explains a useful learning relationship.`).join(" ");
    const chunks = chunkPdfPages("document-1", "large.pdf", [{ page: 4, text }], "Data structures");

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.page === 4 && chunk.content.length <= 6000)).toBe(true);
    expect(chunks.every((chunk) => chunk.topic === "Data structures")).toBe(true);
  });

  it("coalesces short extracted fragments into useful context windows", () => {
    const text = Array.from({ length: 120 }, (_, index) => `Section ${index} explains an important relationship between the concepts.`).join(" ");
    const chunks = chunkPdfPages("document-2", "notes.pdf", [{ page: 2, text }]);

    expect(chunks.length).toBeLessThan(10);
    expect(chunks.map((chunk) => chunk.content).join(" ")).toContain("Section 0");
    expect(chunks.map((chunk) => chunk.content).join(" ")).toContain("Section 119");
  });

  it("rejects malformed and encrypted PDFs with actionable codes", () => {
    expect(() => extractPdfPages(Buffer.from("not a PDF"))).toThrowError(PdfExtractionError);
    expect(() => extractPdfPages(Buffer.from("%PDF-1.4\n/Encrypt 4 0 R"))).toThrowError(/encrypted/i);
  });
});
