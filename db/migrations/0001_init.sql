-- Sourced: thin-slice schema (workspaces, documents, chunks, unanswered_queries).
-- Run this in the Supabase SQL editor (or via `psql`) before using the app.
--
-- Scope notes:
--   * Single workspace for now. workspace_members exists so the model is
--     ready for auth later, but nothing seeds or reads it yet.
--   * pgvector extension is enabled here. No ANN index (HNSW/IVFFlat) is
--     created yet on purpose -- add one only after there are real rows,
--     and only after confirming with the project owner. Cosine distance
--     queries work fine without an index at small scale, just unindexed.
--   * RLS is enabled with no policies, i.e. locked down by default. The
--     app talks to Postgres with the Supabase service role key from server
--     code only, which bypasses RLS. If the anon key is ever used directly
--     against these tables, it will see nothing.

create extension if not exists pgcrypto;
create extension if not exists vector;

-- One workspace = one tenant. Thin slice uses exactly one row, seeded by
-- 0002_seed_workspace.sql with a fixed id hardcoded in src/lib/constants.ts.
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- Membership table for when auth is added. Not used by the app yet.
create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  status text not null default 'processing'
    check (status in ('processing', 'ready', 'failed')),
  chunk_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists documents_workspace_id_idx on documents (workspace_id);

-- embedding width (768) must match EMBEDDING_DIMENSIONS in
-- src/lib/constants.ts. Changing the model/width later needs a new
-- migration that alters this column and re-embeds existing rows.
create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  page_number integer,
  content text not null,
  token_count integer,
  embedding vector(768),
  created_at timestamptz not null default now()
);

create index if not exists chunks_document_id_idx on chunks (document_id);
create index if not exists chunks_workspace_id_idx on chunks (workspace_id);
-- No vector index yet. See note at the top of this file.

create table if not exists unanswered_queries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  query text not null,
  best_similarity real,
  created_at timestamptz not null default now()
);

create index if not exists unanswered_queries_workspace_id_idx on unanswered_queries (workspace_id);

alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table documents enable row level security;
alter table chunks enable row level security;
alter table unanswered_queries enable row level security;
-- Intentionally no policies: only the service role (server-side, bypasses
-- RLS) reads or writes these tables in this slice.

-- Similarity search used by the ask endpoint. Cosine distance via `<=>`.
-- 1 - distance = cosine similarity for the threshold check in the app.
create or replace function match_chunks(
  query_embedding vector(768),
  match_workspace uuid,
  match_count int default 6
)
returns table (
  id uuid,
  document_id uuid,
  document_name text,
  page_number int,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    c.id,
    c.document_id,
    d.file_name as document_name,
    c.page_number,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  join documents d on d.id = c.document_id
  where c.workspace_id = match_workspace
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
