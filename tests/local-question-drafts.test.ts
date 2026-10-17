import { describe, expect, it } from "vitest";
import { draftQuestionsFromNotes } from "@/features/teacher-portal/local-question-drafts";

const notes = [
  "Python variables store changing values, such as a counter that begins at 3.",
  "A for loop repeats a block of instructions while its range contains more numbers.",
  "Functions group reusable instructions and return a result to the caller.",
  "Arrays store ordered values, and indexes identify each position in the collection.",
  "A database table organizes records into rows and columns for reliable queries.",
].join(" ");

describe("local teacher question drafts", () => {
  it("skips filler-only sentences", () => {
    expect(draftQuestionsFromNotes("Hello and welcome. This is a brief introduction. Thank you for reading.", 5, "foundation")).toEqual([]);
  });

  it("creates MCQs with exactly one correct option", () => {
    const drafts = draftQuestionsFromNotes(notes, 5, "intermediate");
    const multipleChoice = drafts.filter((draft) => draft.options && draft.options.length > 2);
    expect(drafts).toHaveLength(5);
    expect(multipleChoice.length).toBeGreaterThan(0);
    for (const draft of multipleChoice) {
      expect(draft.options).toHaveLength(4);
      expect(draft.options?.filter((option) => option === draft.answer)).toHaveLength(1);
      expect(new Set(draft.options?.map((option) => option.toLowerCase())).size).toBe(4);
    }
  });

  it("returns identical drafts for the same notes, count, and level", () => {
    expect(draftQuestionsFromNotes(notes, 5, "foundation")).toEqual(draftQuestionsFromNotes(notes, 5, "foundation"));
  });
});
