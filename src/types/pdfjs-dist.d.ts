// pdfjs-dist ships this worker entry as a plain .mjs with no type
// declarations. We only import it for its side effect (it sets
// `globalThis.pdfjsWorker`), see src/lib/parsing.ts for why.
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs";
