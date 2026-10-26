import { DocumentsPanel } from "@/app/components/DocumentsPanel";
import { AskPanel } from "@/app/components/AskPanel";

export function WorkspaceApp() {
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

      <DocumentsPanel />
      <AskPanel />
    </main>
  );
}
