import "server-only";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

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
  // pdfjs-dist's Node "fake worker" path normally works by dynamically
  // importing its own worker file via a hardcoded relative specifier
  // ("./pdf.worker.mjs", resolved against wherever pdf.mjs itself ended up
  // on disk). Once a bundler (Turbopack/webpack) gets involved, that
  // relative self-import can break intermittently across recompiles,
  // because pdf.mjs's own chunk location shifts between dev server
  // compilation generations while the worker file does not move with it.
  // That's the "Setting up fake worker failed: Cannot find module
  // ...pdf.worker.mjs" error, and why it can work a few times then fail.
  //
  // pdfjs checks `globalThis.pdfjsWorker` BEFORE attempting that fragile
  // self-import, and the worker module sets exactly that global as a side
  // effect when loaded. Importing it ourselves here, through our own
  // (correctly resolved) import specifier, short-circuits the broken path
  // entirely. This import is cached after the first call, so repeating it
  // on every upload is cheap.
  await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Belt-and-suspenders: also point workerSrc at the worker file's real,
  // independently-resolved location on disk (via Node's own require
  // resolution, not whatever path a bundler moved pdf.mjs's chunk to), in
  // case the pre-import above ever doesn't short-circuit pdfjs's internal
  // fake-worker setup for some module-instance reason. Converted through
  // pathToFileURL because a bare filesystem path isn't a valid ESM import
  // specifier on Windows.
  const requireFromHere = createRequire(import.meta.url);
  const workerPath = requireFromHere.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

  const loadingTask = pdfjs.getDocument({
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
