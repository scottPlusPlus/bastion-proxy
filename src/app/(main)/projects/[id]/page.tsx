import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RenameProjectForm } from "@/components/Project/RenameProjectForm";
import { ApiKeyList } from "@/components/Project/EnvVars/ApiKeyList";
import { EnvVarTable } from "@/components/Project/EnvVars/EnvVarTable";
import { DeleteProjectButton } from "@/components/Project/DeleteProjectButton";
import {
  deleteProject,
  createApiKey,
  updateApiKeyPermissions,
  regenerateApiKey,
  deleteApiKey,
  upsertEnvVar,
  duplicateEnvVars,
} from "@/lib/project-actions";
import type { DisplayEnvVar } from "@/components/Project/EnvVars/EnvVarTable";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [project, otherProjects] = await Promise.all([
    prisma.project.findUnique({
      where: { id, userId: session.user.id },
      include: {
        apiKeys: { orderBy: { createdAt: "asc" }, include: { permissions: true } },
        envVars: { orderBy: { key: "asc" } },
      },
    }),
    prisma.project.findMany({
      where: { userId: session.user.id, NOT: { id } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!project) notFound();

  // Decrypt values; strip secrets before passing to client components
  const displayEnvVars: DisplayEnvVar[] = project.envVars.map((v) => ({
    id: v.id,
    key: v.key,
    value: v.isSecret ? null : decrypt(v.value),
    isSecret: v.isSecret,
    locked: v.locked,
  }));

  const deleteAction = deleteProject.bind(null, id);
  const createKeyAction = createApiKey.bind(null, id);
  const upsertAction = upsertEnvVar.bind(null, id);
  const duplicateAction = duplicateEnvVars.bind(null, id);

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

      {/* API Keys */}
      <div>
        <h2 className="text-lg font-semibold mb-3">API Keys</h2>
        <div className="card bg-base-200 p-4">
          <ApiKeyList
            apiKeys={project.apiKeys}
            createKeyAction={createKeyAction}
            updatePermissionsAction={updateApiKeyPermissions}
            regenerateAction={regenerateApiKey}
            deleteAction={deleteApiKey}
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
            duplicateAction={duplicateAction}
            otherProjects={otherProjects}
          />
        </div>
      </div>
    </div>
  );
}
