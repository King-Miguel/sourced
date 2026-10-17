import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { parsePdfPages, parseTextFile } from "@/lib/parsing";
import { chunkPages } from "@/lib/chunking";
import { embedDocumentChunks } from "@/lib/ai/embeddings";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

export class PipelineError extends Error {}

/**
 * Full ingest pipeline for one uploaded file: parse -> chunk -> embed ->
 * store. Runs synchronously inside the upload request, which is fine for
 * demo-sized documents. Marks the document 'ready' with its chunk count on
 * success, or 'failed' with an error message on any failure.
 */
export async function processDocument(
  documentId: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ chunkCount: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new PipelineError("Supabase is not configured.");

  try {
    const pages =
      mimeType === "application/pdf" ? await parsePdfPages(buffer) : parseTextFile(buffer);

    const chunks = chunkPages(pages);
    if (chunks.length === 0) {
      throw new PipelineError("No extractable text was found in this file.");
    }

    const embeddings = await embedDocumentChunks(chunks.map((c) => c.content));

    const rows = chunks.map((chunk, i) => ({
      document_id: documentId,
      workspace_id: DEFAULT_WORKSPACE_ID,
      page_number: chunk.pageNumber,
      content: chunk.content,
      token_count: chunk.tokenCount,
      embedding: embeddings[i],
    }));

    const { error: insertError } = await supabase.from("chunks").insert(rows);
    if (insertError) throw new PipelineError(`Failed to store chunks: ${insertError.message}`);

    const { error: updateError } = await supabase
      .from("documents")
      .update({ status: "ready", chunk_count: rows.length })
      .eq("id", documentId);
    if (updateError) throw new PipelineError(`Failed to finalize document: ${updateError.message}`);

    return { chunkCount: rows.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown processing error.";
    await supabase
      .from("documents")
      .update({ status: "failed", error_message: message.slice(0, 2000) })
      .eq("id", documentId);
    throw error;
  }
}
