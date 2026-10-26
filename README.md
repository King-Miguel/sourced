# Sourced

Answers from your documents, with sources.

Upload a PDF or TXT file, ask a question in plain language, and get an
answer built only from that document, with a citation chip pointing at the
exact page. Questions outside the document get a plain refusal instead of a
guess, and get logged so you can see what your documents are missing.

This is a thin, working vertical slice: one workspace, one ingest pipeline,
one ask endpoint. No auth, no multi-tenant dashboard, no eval harness yet.
Working and boring beats pretty and broken.

## How it works

```
upload (PDF/TXT)
  -> parse per page
  -> chunk per page (~800 tokens, ~15% overlap)
  -> embed each chunk (Gemini gemini-embedding-001, 768-dim)
  -> store in Supabase Postgres + pgvector

ask a question
  -> embed the question
  -> cosine similarity search over chunks (Postgres function match_chunks)
  -> best match below threshold -> refuse, log to unanswered_queries
  -> otherwise -> stream an answer constrained to the retrieved chunks,
     return citation chips (document name + page)
```

## 1. Install

```bash
npm install
```

## 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project (free tier is fine).
2. Open the SQL Editor in the Supabase dashboard.
3. Paste and run **`db/migrations/0001_init.sql`** first. It enables the
   `vector` extension, creates `workspaces`, `workspace_members`,
   `documents`, `chunks`, `unanswered_queries`, the `match_chunks`
   similarity search function, and grants `service_role` access to all of
   it. RLS is enabled on every table with no policies, the app talks to
   Postgres with the service role key only.
4. Paste and run **`db/migrations/0002_seed_workspace.sql`** next. It inserts
   the single demo workspace row with a fixed id that the app has hardcoded
   (`DEFAULT_WORKSPACE_ID` in `src/lib/constants.ts`).
5. Paste and run **`db/migrations/0003_grants.sql`** last. It's a safety net:
   Supabase stopped auto-granting table access to `anon`/`authenticated`/
   `service_role` on new projects starting May 30, 2026 (enforced on every
   project since October 30, 2026), so without an explicit `GRANT`, even the
   service role key gets `permission denied for table X`, RLS bypass does
   not skip that separate, earlier check. `0001_init.sql` already includes
   this grant, so running `0003` again is redundant but harmless (`GRANT` is
   idempotent). Run it anyway, in case your project predates that fix or you
   ever re-run migrations out of order.

No vector index (HNSW) is created yet, on purpose. Cosine similarity search
works fine without one at small scale. Once there are real rows, a follow-up
migration can add an HNSW index, do that only after confirming it's wanted.

## 3. Get a Gemini API key

Create one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
Used for both embeddings (`gemini-embedding-001`) and the answer model
(`gemini-3.8-flash`, see `src/lib/constants.ts` to change it).

## 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` (never commit this file, it's gitignored):

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Project Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page > anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page > service_role key (server-side only, never expose to the browser) |
| `GEMINI_API_KEY` | Google AI Studio API key |

If any of these are missing, the app shows a plain "Setup required" screen
instead of crashing, both on the homepage and from the API routes (503 with
a JSON body listing what's missing).

## 5. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 6. Try the demo flow

A fictional construction equipment rental handbook is included at
`db/seed/ridgeline-equipment-handbook.pdf` (6 pages, generated for this demo,
not a real company).

1. Upload it on the page. It should process and show a chunk count (one
   chunk per page for this file, since each page is short).
2. Ask an in-scope question, for example:
   - "What's the deductible for damage to an excavator bucket?" (page 3)
   - "How much is the late return fee?" (page 5)
   You should get a streamed answer with a citation chip naming the file and
   page.
3. Ask an out-of-scope question, for example:
   - "What's your refund policy on tires for personal vehicles?"
   You should get the plain refusal: "I could not find this in the provided
   documents."
4. Check the `unanswered_queries` table in the Supabase table editor, the
   refused question should be there with its best similarity score.

## Notes on the design choices

- **Chunking is page-bounded.** A chunk never spans two pages, so every
  citation can point at exactly one page. A page shorter than ~800 tokens
  becomes a single chunk; a longer page is split with ~15% overlap. Token
  counts are approximated as `words / 0.75` rather than pulling in a full
  tokenizer, this is a standard heuristic for English text and good enough
  for chunk sizing.
- **Embeddings:** `gemini-embedding-001`, truncated to 768 dimensions via
  `outputDimensionality`. This must match the `vector(768)` column in the
  `chunks` table. Changing the model or width later needs a migration that
  alters the column and re-embeds existing rows.
- **Refusal threshold:** `SIMILARITY_THRESHOLD` in `src/lib/constants.ts`
  (currently 0.72). Tune this after trying real questions, if real answers
  get refused, lower it; if irrelevant chunks get answered, raise it.
- **Rate limiting:** a simple in-memory fixed-window limiter on `/api/ask`
  (`src/lib/rateLimit.ts`), fine for a single instance. If this ever runs
  across multiple serverless instances, swap it for a shared store (Upstash
  Redis or similar) without changing the call site.
- **Single workspace:** the `workspaces` / `workspace_members` tables exist
  for when auth and multi-tenancy are added, but the app currently reads and
  writes one hardcoded workspace id. There is no workspace picker.
- **Security:** API keys are read server-side only (`src/lib/env.ts`), never
  sent to the browser. RLS is enabled with no policies on every table.
