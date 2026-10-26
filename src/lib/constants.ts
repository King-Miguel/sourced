// Fixed id for the single demo workspace used by this thin slice.
// Matches the row inserted by db/migrations/0002_seed_workspace.sql.
// Multi-workspace support (picking a workspace in the UI, auth-scoped
// membership) is out of scope for this slice and comes later.
export const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

// Embedding model: Gemini gemini-embedding-001, truncated to 768 dimensions
// via outputDimensionality (Google's recommended sizes are 768/1536/3072).
// This MUST match the `vector(768)` column type in db/migrations/0001_init.sql.
// If you ever change the embedding model or dimensions, you also need a
// migration that changes the column width and re-embeds every existing chunk.
export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;

// Gemini's batchEmbedContents endpoint hard-caps a batch at 100 requests.
export const EMBEDDING_BATCH_SIZE = 50;

// Chat/generation model used for the "ask" endpoint. Centralized here so
// bumping to a newer Gemini model is a one-line change.
// gemini-2.5-flash was retired for new API keys (Google's error pointed new
// accounts at gemini-3.8-flash instead); switched to that.
export const CHAT_MODEL = "gemini-3.8-flash";

// Chunking targets. Tokens are approximated as (words / 0.75), the common
// heuristic for English text, so we never need to pull in a full tokenizer
// for this slice. Chunks are page-bounded: a chunk never spans two pages,
// so every citation can point at one exact page.
export const CHUNK_TARGET_TOKENS = 800;
export const CHUNK_OVERLAP_RATIO = 0.15;

// Below this cosine similarity, the ask endpoint refuses instead of
// answering, and logs the question into unanswered_queries.
export const SIMILARITY_THRESHOLD = 0.72;

// How many chunks to pull back per question.
export const MATCH_COUNT = 6;

// Upload limits for the demo. Keep generous but bounded.
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
export const ACCEPTED_MIME_TYPES = ["application/pdf", "text/plain"];

// Simple in-memory rate limit for /api/ask. See src/lib/rateLimit.ts.
export const ASK_RATE_LIMIT_MAX_REQUESTS = 10;
export const ASK_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
