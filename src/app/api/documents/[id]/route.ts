import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getMissingEnvVars, isAppConfigured } from "@/lib/env";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAppConfigured()) {
    return Response.json({ error: "Setup required", missing: getMissingEnvVars() }, { status: 503 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin()!;

  // chunks.document_id has ON DELETE CASCADE (db/migrations/0001_init.sql),
  // so deleting the document row also removes every chunk that belongs to
  // it. No separate cleanup step needed.
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("workspace_id", DEFAULT_WORKSPACE_ID);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
