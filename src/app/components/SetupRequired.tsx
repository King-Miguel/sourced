import type { RequiredEnvVar } from "@/lib/env";
import { Icon } from "@/app/components/Icon";

const VAR_NOTES: Record<RequiredEnvVar, string> = {
  NEXT_PUBLIC_SUPABASE_URL: "Project URL, from Supabase > Project Settings > API.",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon public key, from the same API settings page.",
  SUPABASE_SERVICE_ROLE_KEY: "service_role key, same page. Server-side only, never expose this to the browser.",
  GEMINI_API_KEY: "Gemini API key, from Google AI Studio.",
};

export function SetupRequired({ missing }: { missing: RequiredEnvVar[] }) {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col justify-center px-6 py-16">
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
          <Icon name="settings" className="text-slate-500" />
        </div>

        <p className="text-xs font-semibold tracking-wide text-indigo-600 uppercase">Setup required</p>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">
          Sourced needs a few environment variables before it can run.
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Add these to <code className="rounded bg-slate-100 px-1 py-0.5">.env.local</code> at the
          project root, then restart the dev server.
        </p>

        <ul className="mt-6 space-y-3 text-left">
          {missing.map((name) => (
            <li key={name} className="flex items-start gap-2.5 rounded-md border border-slate-200 bg-slate-50 p-3">
              <Icon name="radio_button_unchecked" className="mt-0.5 text-base! shrink-0 text-red-500" />
              <div>
                <code className="text-sm font-semibold text-slate-900">{name}</code>
                <p className="mt-1 text-xs text-slate-500">{VAR_NOTES[name]}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-xs text-slate-500">
          A template is at <code className="rounded bg-slate-100 px-1 py-0.5">.env.local.example</code>.
          Copy it to <code className="rounded bg-slate-100 px-1 py-0.5">.env.local</code> and fill in
          real values. Nothing here is committed to the repository.
        </p>
      </div>
    </main>
  );
}
