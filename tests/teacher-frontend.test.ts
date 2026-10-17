import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("teacher generation loading state", () => {
  it("clears the loading state when the generation request fails or succeeds", () => {
    const source = readFileSync("src/components/teacher/assignment-studio.tsx", "utf8");
    expect(source).toMatch(/finally\s*\{\s*setGeneratingPdf\(false\);\s*\}/);
    expect(source).toContain('saveAssignment("published", generatedQuestions, payload.data.visualExplanation)');
    expect(source).toContain("published them to the student portal");
  });
});
