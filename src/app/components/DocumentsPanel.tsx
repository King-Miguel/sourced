"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/app/components/Icon";
import { formatRelativeTime } from "@/lib/formatRelative";
import { MAX_UPLOAD_BYTES, ACCEPTED_MIME_TYPES } from "@/lib/constants";

interface DocumentRow {
  id: string;
  file_name: string;
  status: "processing" | "ready" | "failed";
  chunk_count: number;
  error_message?: string | null;
  created_at: string;
}

function isAcceptedFile(file: File): boolean {
  if (ACCEPTED_MIME_TYPES.includes(file.type)) return true;
  const lower = file.name.toLowerCase();
  return lower.endsWith(".pdf") || lower.endsWith(".txt");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function fileIconFor(fileName: string): string {
  return fileName.toLowerCase().endsWith(".txt") ? "text_snippet" : "description";
}

export function DocumentsPanel() {
  const [documents, setDocuments] = useState<DocumentRow[] | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  function pickFile(file: File | null | undefined) {
    if (!file) return;
    setUploadError(null);
    if (!isAcceptedFile(file)) {
      setUploadError("Only PDF or TXT files are accepted.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(`File is too large. Max ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB for this demo.`);
      return;
    }
    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed.");
      }
      await loadDocuments();
    } catch {
      setUploadError("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) await loadDocuments();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Documents</h2>
          <p className="mt-0.5 text-sm text-slate-500">Upload a PDF or TXT file to make it searchable.</p>
        </div>
        {documents && documents.length > 0 && (
          <span className="hidden shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 sm:inline-block">
            {documents.length} file{documents.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="p-6">
        {!selectedFile ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              pickFile(e.dataTransfer.files?.[0]);
            }}
            className={`cursor-pointer rounded-md border border-dashed p-7 text-center transition-colors ${
              isDragging ? "border-indigo-400 bg-indigo-50/50" : "border-slate-300 hover:border-slate-400"
            }`}
          >
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
              <Icon name="upload_file" className="text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              Drop a PDF or TXT file here, or <span className="text-indigo-600 underline">browse</span>
            </p>
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">PDF</span>
              <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">TXT</span>
              <span>Max {Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB per file</span>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <Icon name={fileIconFor(selectedFile.name)} className="text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400">{formatBytes(selectedFile.size)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600 disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload file"}
                </button>
              </div>
            </div>
            {uploading && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
                  Parsing and indexing...
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-1/3 animate-[indeterminate_1.2s_ease-in-out_infinite] rounded-full bg-indigo-500" />
                </div>
              </div>
            )}
          </div>
        )}
        {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
      </div>

      <div className="border-t border-slate-100">
        {documents === null && (
          <div className="divide-y divide-slate-100">
            {[0, 1].map((i) => (
              <div key={i} className="flex animate-pulse items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded bg-slate-200" />
                  <div>
                    <div className="mb-2 h-3.5 w-40 rounded bg-slate-200" />
                    <div className="h-3 w-24 rounded bg-slate-100" />
                  </div>
                </div>
                <div className="h-5 w-16 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {documents?.length === 0 && (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
              <Icon name="folder_open" className="text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-700">No documents yet. Upload one to get started.</p>
          </div>
        )}

        {documents && documents.length > 0 && (
          <div className="divide-y divide-slate-100">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-start justify-between gap-3 px-6 py-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <Icon name={fileIconFor(doc.file_name)} className="text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-800">{doc.file_name}</p>
                      <StatusBadge status={doc.status} />
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <span>{doc.chunk_count} chunks</span>
                      <span>&middot;</span>
                      <span>{formatRelativeTime(doc.created_at)}</span>
                    </div>
                    {doc.status === "failed" && doc.error_message && (
                      <p className="mt-1 text-xs text-red-600">
                        {doc.error_message} Remove it and upload again.
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:text-red-600 disabled:opacity-50"
                >
                  {deletingId === doc.id ? "Removing..." : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: DocumentRow["status"] }) {
  const styles: Record<DocumentRow["status"], { chip: string; dot: string }> = {
    processing: { chip: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
    ready: { chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
    failed: { chip: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  };
  const { chip, dot } = styles[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
}
