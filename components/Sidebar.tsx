import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { storePublicPath } from "@/lib/tenant";

type SidebarProps = {
  storeName: string;
  storeSlug: string;
  active?: "coas" | "referrals";
};

export function Sidebar({
  storeName,
  storeSlug,
  active = "coas",
}: SidebarProps) {
  const shortLabel = storeName.split(/\s+/).slice(0, 2).join(" ").toUpperCase();
  const adminPath = `${storePublicPath(storeSlug)}/admin`;
  const referralsPath = `${adminPath}/referrals`;
  const publicPath = storePublicPath(storeSlug);

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <Link className="brand" href={adminPath} aria-label={`${storeName} dashboard`}>
        <BrandMark />
        <span>
          <small>{storeSlug.slice(0, 2).toUpperCase()}</small>
          <strong>{shortLabel}</strong>
          <em>COA ADMIN</em>
        </span>
      </Link>

      <nav className="nav-tabs">
        <Link
          className={`nav-tab${active === "coas" ? " active" : ""}`}
          href={adminPath}
        >
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
        <Link
          className={`nav-tab${active === "referrals" ? " active" : ""}`}
          href={referralsPath}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M16 8a4 4 0 1 0-3.2-6.4M8 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 2c2.7 0 5 1.6 5 3.5V21H3v-1.5C3 17.6 5.3 16 8 16h8Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          Referrals
        </Link>
      </nav>

      <div className="promo-card">
        <div className="promo-bud" aria-hidden="true">
          🌿
        </div>
        <p>{shortLabel}</p>
        <h2>COAs</h2>
        <span>/store/{storeSlug}</span>
        <Link href={publicPath}>View Public Page</Link>
      </div>
    </aside>
  );
}
