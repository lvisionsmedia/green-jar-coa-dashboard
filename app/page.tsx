import Link from "next/link";
import { auth } from "@/auth";
import { BrandMark } from "@/components/BrandMark";
import { getSessionRole } from "@/lib/session-access";
import { storePublicPath } from "@/lib/tenant";

export default async function HomePage() {
  const session = await auth();
  const isPlatform = getSessionRole(session) === "platform";
  const greenJarPath = storePublicPath("green-jar");

  return (
    <div className="public-home">
      <section
        className="public-page platform-landing"
        aria-labelledby="platform-title"
      >
        <header className="public-header">
          <div className="public-brand">
            <BrandMark small />
            <span>COA Platform</span>
          </div>
          <h1 id="platform-title">Multi-store COA dashboards</h1>
          <p>
            Each store gets its own public COA list and admin login under{" "}
            <code>/store/&#123;slug&#125;</code>.
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
          <Link className="platform-secondary-link" href={greenJarPath}>
            Open Green Jar COAs
          </Link>
        </div>
      </section>
    </div>
  );
}
