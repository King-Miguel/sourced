import "server-only";
import { env } from "@/lib/env";
import { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS, EMBEDDING_BATCH_SIZE } from "@/lib/constants";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export class EmbeddingError extends Error {}

type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

interface BatchEmbedResponse {
  embeddings: { values: number[] }[];
}

interface EmbedResponse {
  embedding: { values: number[] };
}

function assertDimensions(values: number[]): number[] {
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new EmbeddingError(
      `Gemini returned a ${values.length}-dimension embedding, expected ${EMBEDDING_DIMENSIONS}. ` +
        `Check EMBEDDING_MODEL/EMBEDDING_DIMENSIONS in src/lib/constants.ts against the chunks.embedding column width.`
    );
  }
  return values;
}

async function callGemini<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${GEMINI_BASE_URL}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.geminiApiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new EmbeddingError(
      `Gemini embedding request failed (${response.status}): ${detail.slice(0, 500)}`
    );
  }

  return (await response.json()) as T;
}

/** Embeds document chunks in batches of EMBEDDING_BATCH_SIZE (API caps batches at 100). */
export async function embedDocumentChunks(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    const data = await callGemini<BatchEmbedResponse>(
      `models/${EMBEDDING_MODEL}:batchEmbedContents`,
      {
        requests: batch.map((text) => ({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text }] },
          taskType: "RETRIEVAL_DOCUMENT" as TaskType,
          outputDimensionality: EMBEDDING_DIMENSIONS,
        })),
      }
    );
    for (const item of data.embeddings) {
      results.push(assertDimensions(item.values));
    }
  }
  return results;
}

/** Embeds a single user question for similarity search. */
export async function embedQuery(text: string): Promise<number[]> {
  const data = await callGemini<EmbedResponse>(`models/${EMBEDDING_MODEL}:embedContent`, {
    content: { parts: [{ text }] },
    taskType: "RETRIEVAL_QUERY" as TaskType,
    outputDimensionality: EMBEDDING_DIMENSIONS,
  });
  return assertDimensions(data.embedding.values);
}
