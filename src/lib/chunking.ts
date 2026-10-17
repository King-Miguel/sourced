import { CHUNK_TARGET_TOKENS, CHUNK_OVERLAP_RATIO } from "@/lib/constants";
import type { ParsedPage } from "@/lib/parsing";

export interface Chunk {
  pageNumber: number;
  content: string;
  tokenCount: number;
}

// Rough heuristic: ~0.75 tokens per word for English text, i.e. tokens = words / 0.75.
const TOKENS_PER_WORD = 1 / 0.75;

function estimateTokens(wordCount: number): number {
  return Math.round(wordCount * TOKENS_PER_WORD);
}

/**
 * Splits one page of text into one or more chunks, each targeting roughly
 * CHUNK_TARGET_TOKENS tokens with CHUNK_OVERLAP_RATIO overlap between
 * consecutive chunks. Chunks never cross a page boundary, so every chunk
 * can cite a single exact page number. A page shorter than the target
 * becomes a single chunk.
 */
function chunkPage(page: ParsedPage): Chunk[] {
  const words = page.text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const targetWords = Math.max(1, Math.round(CHUNK_TARGET_TOKENS / TOKENS_PER_WORD));
  const overlapWords = Math.round(targetWords * CHUNK_OVERLAP_RATIO);

  if (words.length <= targetWords) {
    return [
      {
        pageNumber: page.pageNumber,
        content: words.join(" "),
        tokenCount: estimateTokens(words.length),
      },
    ];
  }

  const chunks: Chunk[] = [];
  let start = 0;
  const step = Math.max(1, targetWords - overlapWords);

  while (start < words.length) {
    const end = Math.min(start + targetWords, words.length);
    const slice = words.slice(start, end);
    chunks.push({
      pageNumber: page.pageNumber,
      content: slice.join(" "),
      tokenCount: estimateTokens(slice.length),
    });
    if (end >= words.length) break;
    start += step;
  }

  return chunks;
}

export function chunkPages(pages: ParsedPage[]): Chunk[] {
  return pages.flatMap(chunkPage).filter((chunk) => chunk.content.length > 0);
}
