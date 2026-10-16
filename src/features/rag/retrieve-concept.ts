import notes from "@/data/concepts/notes.json";

export interface ConceptNote {
  id: string;
  title: string;
  keywords: string[];
  excerpt: string;
  body: string;
}

export interface RetrievedNote {
  note: ConceptNote;
  score: number;
}

const NOTES: readonly ConceptNote[] = notes;

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z][a-z0-9-]*/g) ?? [];
}

/** Deterministic keyword overlap retrieval over the local starter notes. */
export function retrieveConceptNotes(query: string, limit = 2): RetrievedNote[] {
  const queryWords = new Set(tokenize(query));
  if (!queryWords.size) return [];

  return NOTES.map((note) => {
    const noteTerms = new Set([...tokenize(note.title), ...note.keywords.map((word) => word.toLowerCase()), ...tokenize(note.excerpt)]);
    const score = [...queryWords].filter((word) => noteTerms.has(word)).length;
    return { note, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.note.id.localeCompare(b.note.id))
    .slice(0, Math.max(0, limit));
}
