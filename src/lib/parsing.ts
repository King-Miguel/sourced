import "server-only";

export interface ParsedPage {
  pageNumber: number;
  text: string;
}

/**
 * Extracts text per page from a PDF buffer using pdfjs-dist's legacy Node
 * build. No native canvas dependency, text only, which is all this slice
 * needs for chunking and citations.
 */
export async function parsePdfPages(buffer: Buffer): Promise<ParsedPage[]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    disableFontFace: true,
    verbosity: 0,
  });

  const doc = await loadingTask.promise;
  const pages: ParsedPage[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      pages.push({ pageNumber, text });
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }

  return pages;
}

/** Plain text files have no real pagination, so the whole file is page 1. */
export function parseTextFile(buffer: Buffer): ParsedPage[] {
  const text = buffer.toString("utf-8").replace(/\s+/g, " ").trim();
  return [{ pageNumber: 1, text }];
}
