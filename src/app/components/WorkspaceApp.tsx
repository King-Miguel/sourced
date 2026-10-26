import { DocumentsPanel } from "@/app/components/DocumentsPanel";
import { AskPanel } from "@/app/components/AskPanel";

export function WorkspaceApp() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-12">
      <header>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white">
            S
          </div>
          <p className="text-xs font-semibold tracking-wide text-indigo-600 uppercase">Sourced</p>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            Demo workspace
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Answers from your documents, with sources.
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload a PDF or TXT file, then ask a question below. Answers are generated only from
          what you upload.
        </p>
      </header>

      <DocumentsPanel />
      <AskPanel />
    </main>
  );
}
