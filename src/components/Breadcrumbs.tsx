import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <div className="breadcrumbs text-sm text-base-content/60">
      <ul>
        {crumbs.map((crumb, i) =>
          crumb.href ? (
            <li key={i}>
              <Link href={crumb.href} className="hover:text-base-content">
                {crumb.label}
              </Link>
            </li>
          ) : (
            <li key={i} className="text-base-content">
              {crumb.label}
            </li>
          )
        )}
      </ul>
    </div>
  );
}
