"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface DocumentRow {
  id: string;
  file_name: string;
  status: "processing" | "ready" | "failed";
  chunk_count: number;
  error_message?: string | null;
  created_at: string;
}

interface Citation {
  documentName: string;
  pageNumber: number | null;
  similarity: number;
}

type AskState =
  | { phase: "idle" }
  | { phase: "asking" }
  | { phase: "answer"; text: string; citations: Citation[] }
  | { phase: "refused"; message: string; bestSimilarity: number }
  | { phase: "error"; message: string };

export function WorkspaceApp() {
  const [documents, setDocuments] = useState<DocumentRow[] | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("");
  const [ask, setAsk] = useState<AskState>({ phase: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    const res = await fetch("/api/documents");
    if (!res.ok) return;
    const data = await res.json();
    setDocuments(data.documents ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/documents");
      if (cancelled || !res.ok) return;
      const data = await res.json();
      if (!cancelled) setDocuments(data.documents ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed.");
      }
      await loadDocuments();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setUploadError("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleAsk(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
        setAsk({ phase: "error", message: data?.error ?? `Request failed (${res.status}).` });
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
      setAsk({ phase: "answer", text: "", citations });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAsk({ phase: "answer", text, citations });
      }
    } catch {
      setAsk({ phase: "error", message: "Something went wrong while asking. Try again." });
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-12">
      <header>
        <p className="text-xs font-semibold tracking-wide text-indigo-600 uppercase">Sourced</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Answers from your documents, with sources.
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Demo workspace. Upload a PDF or TXT file, then ask about it below.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Documents</h2>

        <form onSubmit={handleUpload} className="mt-4 flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            className="block flex-1 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
          <button
            type="submit"
            disabled={uploading}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
        {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}

        <div className="mt-5 divide-y divide-slate-100">
          {documents === null && <p className="py-3 text-sm text-slate-400">Loading...</p>}
          {documents?.length === 0 && (
            <p className="py-3 text-sm text-slate-400">No documents yet. Upload one to get started.</p>
          )}
          {documents?.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{doc.file_name}</p>
                {doc.status === "failed" && doc.error_message && (
                  <p className="text-xs text-red-500">{doc.error_message}</p>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <StatusBadge status={doc.status} />
                <span className="text-slate-400">{doc.chunk_count} chunks</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Ask</h2>

        <form onSubmit={handleAsk} className="mt-4 flex items-start gap-3">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask something about the uploaded documents..."
            rows={2}
            className="flex-1 resize-none rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400"
          />
          <button
            type="submit"
            disabled={ask.phase === "asking"}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {ask.phase === "asking" ? "Asking..." : "Ask"}
          </button>
        </form>

        <div className="mt-5">
          {ask.phase === "answer" && (
            <div>
              <p className="whitespace-pre-wrap text-sm text-slate-800">{ask.text}</p>
              {ask.citations.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {ask.citations.map((c, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                    >
                      {c.documentName}
                      {c.pageNumber ? `, p. ${c.pageNumber}` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {ask.phase === "refused" && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">{ask.message}</p>
              <p className="mt-1 text-xs text-amber-600">
                Best match similarity: {ask.bestSimilarity.toFixed(2)}. Logged for review.
              </p>
            </div>
          )}

          {ask.phase === "error" && (
            <p className="text-sm text-red-600">{ask.message}</p>
          )}

          {ask.phase === "idle" && (
            <p className="text-sm text-slate-400">Answers will appear here, with citations.</p>
          )}
        </div>
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: DocumentRow["status"] }) {
  const styles: Record<DocumentRow["status"], string> = {
    processing: "bg-amber-50 text-amber-700 border-amber-200",
    ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
    failed: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 ${styles[status]}`}>{status}</span>
  );
}
