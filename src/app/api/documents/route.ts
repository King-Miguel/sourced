import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getMissingEnvVars, isAppConfigured } from "@/lib/env";
import { DEFAULT_WORKSPACE_ID, MAX_UPLOAD_BYTES, ACCEPTED_MIME_TYPES } from "@/lib/constants";
import { processDocument } from "@/lib/pipeline";

function setupRequiredResponse() {
  return Response.json(
    { error: "Setup required", missing: getMissingEnvVars() },
    { status: 503 }
  );
}

export async function GET() {
  if (!isAppConfigured()) return setupRequiredResponse();

  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase
    .from("documents")
    .select("id, file_name, status, chunk_count, error_message, created_at")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ documents: data });
}

export async function POST(request: Request) {
  if (!isAppConfigured()) return setupRequiredResponse();

  const supabase = getSupabaseAdmin()!;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Expected multipart/form-data with a 'file' field." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing 'file' field." }, { status: 400 });
  }

  if (file.size === 0) {
    return Response.json({ error: "The uploaded file is empty." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: `File is too large. Max ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB for this demo.` },
      { status: 400 }
    );
  }

  const mimeType = ACCEPTED_MIME_TYPES.includes(file.type)
    ? file.type
    : file.name.toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : file.name.toLowerCase().endsWith(".txt")
        ? "text/plain"
        : null;

  if (!mimeType) {
    return Response.json({ error: "Only PDF or TXT files are accepted." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: document, error: insertError } = await supabase
    .from("documents")
    .insert({
      workspace_id: DEFAULT_WORKSPACE_ID,
      file_name: file.name,
      mime_type: mimeType,
      status: "processing",
    })
    .select("id, file_name, status, chunk_count, created_at")
    .single();

  if (insertError || !document) {
    return Response.json(
      { error: insertError?.message ?? "Failed to create document record." },
      { status: 500 }
    );
  }

  try {
    const { chunkCount } = await processDocument(document.id, buffer, mimeType);
    return Response.json({
      document: { ...document, status: "ready", chunk_count: chunkCount },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed.";
    return Response.json(
      { document: { ...document, status: "failed" }, error: message },
      { status: 502 }
    );
  }
}
