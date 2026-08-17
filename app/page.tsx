import Link from "next/link";
import { auth } from "@/auth";
import { BrandMark } from "@/components/BrandMark";
import { PublicCoaList } from "@/components/PublicCoaList";
import { resolveRequestTenant } from "@/lib/request-tenant";
import { getSessionRole } from "@/lib/session-access";
import { storePublicOrigin } from "@/lib/tenant";

export default async function HomePage() {
  const tenant = await resolveRequestTenant();

  if (tenant.hostKind === "store" && tenant.store) {
    return (
      <div className="public-home">
        <section className="public-page" aria-labelledby="public-page-title">
          <header className="public-header">
            <div className="public-brand">
              <BrandMark small />
              <span>{tenant.store.name}</span>
            </div>
            <h1 id="public-page-title">Certificates of Analysis</h1>
            <p>
              Browse uploaded Certificates of Analysis and open the PDFs
              directly.
            </p>
          </header>
          <PublicCoaList />
        </section>
      </div>
    );
  }

  const session = await auth();
  const isPlatform = getSessionRole(session) === "platform";
  const greenJarUrl = storePublicOrigin("green-jar");

  return (
    <div className="public-home">
      <section className="public-page platform-landing" aria-labelledby="platform-title">
        <header className="public-header">
          <div className="public-brand">
            <BrandMark small />
            <span>COA Platform</span>
          </div>
          <h1 id="platform-title">Multi-store COA dashboards</h1>
          <p>
            Each store gets its own subdomain, public COA list, and admin login.
          </p>
        </header>
        <div className="platform-landing-actions">
          {isPlatform ? (
            <Link className="login-button" href="/platform">
              Manage stores
            </Link>
          ) : (
            <Link className="login-button" href="/login">
              Platform login
            </Link>
          )}
          <a className="platform-secondary-link" href={greenJarUrl}>
            Open Green Jar COAs
          </a>
        </div>
      </section>
    </div>
  );
}
