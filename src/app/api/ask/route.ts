import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getMissingEnvVars, isAppConfigured } from "@/lib/env";
import { DEFAULT_WORKSPACE_ID, MATCH_COUNT, SIMILARITY_THRESHOLD } from "@/lib/constants";
import { embedQuery, EmbeddingError } from "@/lib/ai/embeddings";
import { streamAnswer, type ContextChunk } from "@/lib/ai/chat";
import { checkRateLimit, getClientKey } from "@/lib/rateLimit";

const MAX_QUESTION_LENGTH = 1000;

interface MatchRow {
  id: string;
  document_id: string;
  document_name: string;
  page_number: number | null;
  content: string;
  similarity: number;
}

export interface Citation {
  documentName: string;
  pageNumber: number | null;
  similarity: number;
}

export async function POST(request: Request) {
  if (!isAppConfigured()) {
    return Response.json({ error: "Setup required", missing: getMissingEnvVars() }, { status: 503 });
  }

  const rateLimit = checkRateLimit(getClientKey(request));
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many questions. Please wait before asking again." },
      { status: 429, headers: { "Retry-After": Math.ceil(rateLimit.retryAfterMs / 1000).toString() } }
    );
  }

  let body: { question?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected JSON body with a 'question' field." }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return Response.json({ error: "Question cannot be empty." }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return Response.json(
      { error: `Question is too long. Max ${MAX_QUESTION_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin()!;

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedQuery(question);
  } catch (error) {
    const message = error instanceof EmbeddingError ? error.message : "Failed to embed the question.";
    return Response.json({ error: message }, { status: 502 });
  }

  const { data: matches, error: matchError } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_workspace: DEFAULT_WORKSPACE_ID,
    match_count: MATCH_COUNT,
  });

  if (matchError) {
    return Response.json({ error: `Similarity search failed: ${matchError.message}` }, { status: 500 });
  }

  const rows = (matches ?? []) as MatchRow[];
  const bestSimilarity = rows[0]?.similarity ?? 0;

  if (rows.length === 0 || bestSimilarity < SIMILARITY_THRESHOLD) {
    await supabase.from("unanswered_queries").insert({
      workspace_id: DEFAULT_WORKSPACE_ID,
      query: question,
      best_similarity: bestSimilarity,
    });

    return Response.json(
      {
        refused: true,
        message: "I could not find this in the provided documents.",
        bestSimilarity,
      },
      { headers: { "x-sourced-refused": "true" } }
    );
  }

  const contextChunks: ContextChunk[] = rows.map((row) => ({
    documentName: row.document_name,
    pageNumber: row.page_number,
    content: row.content,
  }));

  const citations: Citation[] = dedupeCitations(
    rows.map((row) => ({
      documentName: row.document_name,
      pageNumber: row.page_number,
      similarity: row.similarity,
    }))
  );

  const result = streamAnswer(question, contextChunks);

  return result.toTextStreamResponse({
    headers: {
      "x-sourced-refused": "false",
      "x-citations": encodeURIComponent(JSON.stringify(citations)),
    },
  });
}

function dedupeCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  const result: Citation[] = [];
  for (const citation of citations) {
    const key = `${citation.documentName}::${citation.pageNumber}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(citation);
  }
  return result;
}
