import type { PageText } from "./extract";

export type Chunk = { page: number; content: string };

// Sliding window over each page, preferring to break at sentence ends.
export function chunkPages(pages: PageText[], size = 1000, overlap = 150): Chunk[] {
  const chunks: Chunk[] = [];
  for (const { page, text } of pages) {
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + size, text.length);
      if (end < text.length) {
        const brk = Math.max(text.lastIndexOf(". ", end), text.lastIndexOf("? ", end), text.lastIndexOf("! ", end));
        if (brk > start + size * 0.5) end = brk + 1;
      }
      const content = text.slice(start, end).trim();
      if (content) chunks.push({ page, content });
      if (end >= text.length) break;
      start = Math.max(end - overlap, start + 1);
    }
  }
  return chunks;
}
