import { getMissingEnvVars } from "@/lib/env";
import { SetupRequired } from "@/app/components/SetupRequired";
import { WorkspaceApp } from "@/app/components/WorkspaceApp";

export default function Home() {
  const missing = getMissingEnvVars();
  if (missing.length > 0) {
    return <SetupRequired missing={missing} />;
  }
  return <WorkspaceApp />;
}
