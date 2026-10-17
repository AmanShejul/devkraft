import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("teacher generation loading state", () => {
  it("requires teacher approval before publishing generated questions", () => {
    const source = readFileSync("src/components/teacher/assignment-studio.tsx", "utf8");
    expect(source).toMatch(/finally\s*\{\s*setGeneratingPdf\(false\);\s*\}/);
    expect(source).toContain("Approve question");
    expect(source).toContain("Approve all after review");
    expect(source).toContain("Publish approved questions");
    expect(source).toContain("questionList.some((question) => question.generationStatus !== \"grounded\"");
    expect(source).toContain("Editing a question removes its approval.");
    expect(source).not.toContain('saveAssignment("published", generatedQuestions');
  });

  it("puts upload and question generation before assignment details", () => {
    const source = readFileSync("src/components/teacher/assignment-studio.tsx", "utf8");
    expect(source.indexOf("Drop your notes or course file here")).toBeLessThan(source.indexOf("Generate questions\"}</button>"));
    expect(source.indexOf("Generate questions\"}</button>")).toBeLessThan(source.indexOf("Generated question drafts"));
    expect(source.indexOf("Generated question drafts")).toBeLessThan(source.indexOf("<h3 className=\"text-sm font-bold text-ink\">Add assignment details"));
  });
});
