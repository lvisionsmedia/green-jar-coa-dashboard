import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

type SidebarProps = {
  storeName: string;
  storeSlug: string;
};

export function Sidebar({ storeName, storeSlug }: SidebarProps) {
  const shortLabel = storeName.split(/\s+/).slice(0, 2).join(" ").toUpperCase();

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <Link className="brand" href="/admin" aria-label={`${storeName} dashboard`}>
        <BrandMark />
        <span>
          <small>{storeSlug.slice(0, 2).toUpperCase()}</small>
          <strong>{shortLabel}</strong>
          <em>COA ADMIN</em>
        </span>
      </Link>

      <nav className="nav-tabs">
        <Link className="nav-tab active" href="/admin">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M14 3v5h5M8 13h8M8 17h8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          COA&apos;s
        </Link>
      </nav>

      <div className="promo-card">
        <div className="promo-bud" aria-hidden="true">
          🌿
        </div>
        <p>{shortLabel}</p>
        <h2>COAs</h2>
        <span>Store subdomain ready.</span>
        <Link href="/">View Public Page</Link>
      </div>
    </aside>
  );
}
