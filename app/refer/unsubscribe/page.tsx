import type { Metadata } from "next";
import Link from "next/link";
import { getReferralBaseUrl } from "@/lib/referral-share";
import { optOutReferrer } from "@/lib/referrals";

export const metadata: Metadata = {
  title: "Unsubscribe | Tell a Friend",
};

type UnsubscribePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UnsubscribePage({
  searchParams,
}: UnsubscribePageProps) {
  const params = await searchParams;
  const tokenRaw = params.token;
  const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;
  let success = false;
  let missing = !token;

  if (token) {
    try {
      success = await optOutReferrer(token);
    } catch (error) {
      console.error("Unsubscribe failed:", error);
      success = false;
    }
  }

  return (
    <div className="refer-shell">
      <header className="refer-topbar">
        <span className="refer-brand">The Green Jar</span>
        <span className="refer-topbar-pill">Email preferences</span>
      </header>
      <main className="refer-main">
        <section className="refer-panel refer-panel-narrow">
          <p className="refer-kicker">Tell a Friend</p>
          <h1 className="refer-title">
            {missing
              ? "Missing unsubscribe link"
              : success
                ? "You’re unsubscribed"
                : "Link not found"}
          </h1>
          <p className="refer-subtitle">
            {missing
              ? "Open the unsubscribe link from your email."
              : success
                ? "You won’t receive weekly Tell a Friend emails anymore. Transactional reward codes will still be sent if a friend redeems."
                : "We couldn’t find that unsubscribe token."}
          </p>
          <Link className="refer-btn-primary" href={getReferralBaseUrl()}>
            Back to Tell a Friend
          </Link>
        </section>
      </main>
    </div>
  );
}
