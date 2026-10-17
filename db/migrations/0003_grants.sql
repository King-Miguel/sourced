-- Fixes "permission denied for table X" (Postgres 42501).
--
-- Supabase changed its platform default: new projects created after May 30,
-- 2026 no longer auto-grant table access to anon/authenticated/service_role
-- (enforced on ALL projects, old and new, from October 30, 2026 onward).
-- service_role bypasses row-level security policies, but base table GRANTs
-- are a separate, earlier check that RLS bypass does not skip. Without this,
-- even the service role key gets permission denied.
--
-- This app only ever talks to Postgres as service_role (see
-- src/lib/supabase/admin.ts), so that is the only role granted here.
-- anon/authenticated are intentionally left with no grants: nothing in this
-- slice reads or writes these tables directly from the browser.

grant usage on schema public to service_role;

grant select, insert, update, delete on table
  public.workspaces,
  public.workspace_members,
  public.documents,
  public.chunks,
  public.unanswered_queries
to service_role;

grant execute on function public.match_chunks(vector, uuid, int) to service_role;
