"use client";

import { useState } from "react";
import { Icon } from "@/app/components/Icon";
import { estimateTokenCount } from "@/lib/formatRelative";

interface Citation {
  documentName: string;
  pageNumber: number | null;
  similarity: number;
  snippet: string;
}

type AskState =
  | { phase: "idle" }
  | { phase: "asking" }
  | { phase: "answer"; text: string; citations: Citation[]; streaming: boolean }
  | { phase: "refused"; message: string; bestSimilarity: number }
  | { phase: "error"; message: string };

export function AskPanel() {
  const [question, setQuestion] = useState("");
  const [ask, setAsk] = useState<AskState>({ phase: "idle" });

  async function submit() {
    const trimmed = question.trim();
    if (!trimmed) return;

    setAsk({ phase: "asking" });

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      const contentType = res.headers.get("content-type") ?? "";

      if (!res.ok) {
        const data = contentType.includes("application/json") ? await res.json() : null;
        let message = data?.error ?? `Request failed (${res.status}).`;
        if (res.status === 429) {
          const retryAfter = res.headers.get("Retry-After");
          if (retryAfter) message = `${message} Try again in ${retryAfter}s.`;
        }
        setAsk({ phase: "error", message });
        return;
      }

      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data.refused) {
          setAsk({ phase: "refused", message: data.message, bestSimilarity: data.bestSimilarity });
        } else {
          setAsk({ phase: "error", message: "Unexpected response from server." });
        }
        return;
      }

      const citationsHeader = res.headers.get("x-citations");
      const citations: Citation[] = citationsHeader
        ? JSON.parse(decodeURIComponent(citationsHeader))
        : [];

      if (!res.body) {
        setAsk({ phase: "error", message: "No response body." });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      setAsk({ phase: "answer", text: "", citations, streaming: true });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAsk({ phase: "answer", text, citations, streaming: true });
      }

      // The model stream can end with zero characters without ever raising
      // an HTTP-level error (a failed generation mid-stream looks identical
      // to "nothing to say" from here). Don't leave a silently blank answer
      // box: surface it as a visible failure instead.
      if (text.trim().length === 0) {
        setAsk({
          phase: "error",
          message: "The AI didn't return an answer. Please try asking again.",
        });
      } else {
        setAsk({ phase: "answer", text, citations, streaming: false });
      }
    } catch {
      setAsk({ phase: "error", message: "Something went wrong while asking. Try again." });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const topSimilarity = ask.phase === "answer" ? ask.citations[0]?.similarity : undefined;

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <h2 className="text-base font-semibold tracking-tight text-slate-900">Ask</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Ask a question and get an answer generated only from your uploaded documents.
        </p>
      </div>

      <div className="border-b border-slate-100 p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-2"
        >
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask something about the uploaded documents..."
            rows={3}
            className="w-full resize-none rounded-md border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              Enter to ask, Shift+Enter for a new line
              {question.trim() && <span> &middot; ~{estimateTokenCount(question)} tokens</span>}
            </p>
            <button
              type="submit"
              disabled={ask.phase === "asking" || !question.trim()}
              className="shrink-0 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {ask.phase === "asking" ? "Asking..." : "Ask"}
            </button>
          </div>
        </form>
      </div>

      <div className="p-6">
        {ask.phase === "idle" && (
          <p className="text-sm text-slate-400">Answers will appear here, with citations.</p>
        )}

        {ask.phase === "asking" && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
            Searching your documents...
          </div>
        )}

        {ask.phase === "answer" && (
          <div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {ask.text}
              {ask.streaming && <span className="streaming-caret" />}
            </p>

            {!ask.streaming && ask.citations.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Icon name="menu_book" className="text-sm! text-slate-400" />
                    Sources
                  </p>
                  {topSimilarity !== undefined && (
                    <span className="text-xs text-slate-400">
                      Top match similarity: {topSimilarity.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ask.citations.map((c, i) => (
                    <div key={i} className="group relative">
                      <span className="inline-flex cursor-default items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 transition-colors group-hover:bg-slate-100">
                        {c.documentName}
                        {c.pageNumber ? `, p. ${c.pageNumber}` : ""}
                      </span>
                      {c.snippet && (
                        <div className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 hidden w-72 rounded-md bg-slate-900 p-3 text-xs leading-relaxed text-slate-100 shadow-lg group-hover:block">
                          &ldquo;{c.snippet}&rdquo;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {ask.phase === "refused" && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-amber-800">
              <Icon name="info" className="text-base!" />
              {ask.message}
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Best match similarity: {ask.bestSimilarity.toFixed(2)}. Logged for review.
            </p>
          </div>
        )}

        {ask.phase === "error" && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-red-700">
              <Icon name="error" className="text-base!" />
              {ask.message}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
