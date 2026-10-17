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
  return chunks
    .filter((chunk) => allowed.has(chunk.documentId))
    .map((chunk, index) => {
      const haystack = new Set(tokens(`${chunk.topic ?? ""} ${chunk.concepts.join(" ")} ${chunk.content}`));
      const overlap = [...queryTokens].filter((token) => haystack.has(token)).length;
      const topicMatch = query.topic && chunk.topic?.toLowerCase() === query.topic.toLowerCase() ? 2 : 0;
      return { chunk, score: overlap + topicMatch, index };
    })
    .filter((item) => item.score > 0 || queryTokens.size === 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, query.limit ?? 8)
    .map((item) => item.chunk);
}
