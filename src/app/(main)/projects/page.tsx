import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { createProject } from "@/lib/project-actions";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-2xl w-full mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Projects</h1>

      <form action={createProject} className="flex gap-2 mb-8">
        <input
          name="name"
          type="text"
          placeholder="New project name"
          className="input input-bordered flex-1"
          required
        />
        <button type="submit" className="btn btn-primary">
          Create
        </button>
      </form>

      {projects.length === 0 ? (
        <p className="text-base-content/60">No projects yet. Create one above.</p>
      ) : (
        <ul className="space-y-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="card bg-base-200 hover:bg-base-300 transition-colors p-4 block"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-base-content/40">
                    {p.createdAt.toLocaleDateString()}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
