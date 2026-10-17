import "server-only";
import { streamText } from "ai";
import { createGoogle } from "@ai-sdk/google";
import { env } from "@/lib/env";
import { CHAT_MODEL } from "@/lib/constants";

const google = createGoogle({ apiKey: env.geminiApiKey });

export interface ContextChunk {
  documentName: string;
  pageNumber: number | null;
  content: string;
}

function buildSystemPrompt(contextChunks: ContextChunk[]): string {
  const context = contextChunks
    .map(
      (chunk, index) =>
        `[${index + 1}] Source: ${chunk.documentName}${
          chunk.pageNumber ? `, page ${chunk.pageNumber}` : ""
        }\n${chunk.content}`
    )
    .join("\n\n---\n\n");

  return [
    "You are a document assistant. Answer ONLY using the context excerpts below.",
    "Do not use outside knowledge, do not guess, and do not fill gaps with assumptions.",
    "If the context does not contain the answer, say plainly that you could not find it in the provided documents.",
    "When you state a fact from the context, reference it by its bracket number, like [1].",
    "Keep answers concise and direct.",
    "",
    "Context excerpts:",
    context,
  ].join("\n");
}

/** Streams an answer constrained to the given retrieved chunks. */
export function streamAnswer(question: string, contextChunks: ContextChunk[]) {
  return streamText({
    model: google(CHAT_MODEL),
    system: buildSystemPrompt(contextChunks),
    prompt: question,
  });
}
