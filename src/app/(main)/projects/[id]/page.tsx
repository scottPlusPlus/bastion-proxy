import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RenameProjectForm } from "@/components/Project/RenameProjectForm";
import { ApiKeyDisplay } from "@/components/Project/EnvVars/ApiKeyDisplay";
import { EnvVarTable } from "@/components/Project/EnvVars/EnvVarTable";
import { DeleteProjectButton } from "@/components/Project/DeleteProjectButton";
import {
  deleteProject,
  regenerateApiKey,
  upsertEnvVar,
} from "@/lib/project-actions";
import type { DisplayEnvVar } from "@/components/Project/EnvVars/EnvVarTable";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id, userId: session.user.id },
    include: {
      apiKey: true,
      envVars: { orderBy: { key: "asc" } },
    },
  });

  if (!project) notFound();

  // Decrypt values; strip secrets before passing to client components
  const displayEnvVars: DisplayEnvVar[] = project.envVars.map((v) => ({
    id: v.id,
    key: v.key,
    value: v.isSecret ? null : decrypt(v.value),
    isSecret: v.isSecret,
  }));

  const deleteAction = deleteProject.bind(null, id);
  const regenerateAction = regenerateApiKey.bind(null, id);
  const upsertAction = upsertEnvVar.bind(null, id);

  return (
    <div className="max-w-5xl w-full mx-auto p-6 space-y-8">
      <Breadcrumbs
        crumbs={[
          { label: "Projects", href: "/projects" },
          { label: project.name },
        ]}
      />

      {/* Name + actions */}
      <div className="flex items-start justify-between gap-4">
        <RenameProjectForm id={id} currentName={project.name} />
        <div className="flex items-center gap-2">
          <Link href={`/projects/${id}/audit`} className="btn btn-ghost btn-sm">
            Audit log
          </Link>
          <DeleteProjectButton
            projectName={project.name}
            deleteAction={deleteAction}
          />
        </div>
      </div>

      {/* API Key */}
      <div>
        <h2 className="text-lg font-semibold mb-3">API Key</h2>
        <div className="card bg-base-200 p-4">
          <ApiKeyDisplay
            apiKey={project.apiKey?.key ?? null}
            regenerateAction={regenerateAction}
          />
        </div>
      </div>

      {/* Environment Variables */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Environment Variables</h2>
        <div className="card bg-base-200 p-4">
          <EnvVarTable
            envVars={displayEnvVars}
            upsertAction={upsertAction}
          />
        </div>
      </div>
    </div>
  );
}
