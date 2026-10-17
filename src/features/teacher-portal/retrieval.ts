import type { SourceChunk } from "./contracts";

const stopWords = new Set(["about", "after", "also", "because", "between", "could", "from", "have", "into", "more", "most", "other", "that", "their", "there", "these", "this", "through", "using", "which", "while", "where", "when", "with"]);

function tokens(value: string): string[] {
  return (value.toLowerCase().match(/[a-z0-9][a-z0-9-]*/g) ?? []).filter((token) => token.length > 2 && !stopWords.has(token));
}

export interface RetrievalQuery {
  documentIds: readonly string[];
  topic?: string;
  objectives?: readonly string[];
  limit?: number;
}

export function retrieveRelevantChunks(chunks: readonly SourceChunk[], query: RetrievalQuery): SourceChunk[] {
  const allowed = new Set(query.documentIds);
  const queryTokens = new Set(tokens([query.topic ?? "", ...(query.objectives ?? [])].join(" ")));
  const ranked = chunks
    .filter((chunk) => allowed.has(chunk.documentId))
    .map((chunk, index) => {
      const haystack = new Set(tokens(`${chunk.topic ?? ""} ${chunk.concepts.join(" ")} ${chunk.content}`));
      const overlap = [...queryTokens].filter((token) => haystack.has(token)).length;
      const topicMatch = query.topic && chunk.topic?.toLowerCase() === query.topic.toLowerCase() ? 2 : 0;
      return { chunk, score: overlap + topicMatch, index };
    })
    .filter((item) => item.score > 0 || queryTokens.size === 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);
  const limit = Math.max(1, query.limit ?? 8);
  if (ranked.length <= limit) return ranked.map((item) => item.chunk);

  const selected = new Map<number, (typeof ranked)[number]>();
  const documentChunkCount = Math.max(chunks.length, 1);
  for (const item of ranked) {
    const section = Math.min(limit - 1, Math.floor(item.index / documentChunkCount * limit));
    const current = selected.get(section);
    if (!current || item.score > current.score || (item.score === current.score && item.index < current.index)) {
      selected.set(section, item);
    }
  }
  for (const item of ranked) {
    if (selected.size >= limit) break;
    if (![...selected.values()].some((chosen) => chosen.index === item.index)) {
      selected.set(limit + item.index, item);
    }
  }
  return [...selected.values()]
    .sort((left, right) => left.index - right.index)
    .slice(0, limit)
    .map((item) => item.chunk);
}
