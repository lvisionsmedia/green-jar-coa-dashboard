"use client";

import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import type { RewardChoice } from "@/lib/types";

type Stats = {
  referrers: number;
  redemptionsAllTime: number;
  redemptionsThisWeek: number;
  pendingRewards: number;
  claimedRewards: number;
  expiredRewards: number;
};

type RedemptionRow = {
  id: string;
  friendName: string;
  friendEmail: string;
  friendPhoneE164: string;
  rewardChoice: RewardChoice;
  redeemedAt: string;
  claimCode: string | null;
  rewardStatus: string | null;
  referrerName: string | null;
  referrerPhoneDisplay: string | null;
  referrerEmailSentAt: string | null;
  friendEmailSentAt: string | null;
};

type PendingRow = {
  id: string;
  claimCode: string;
  expiresAt: string;
  referrerName?: string;
  referrerPhoneDisplay?: string;
  referrerEmail?: string;
};

type AdminReferralsProps = {
  storeId: string;
  storeName: string;
  storeSlug: string;
};

export function AdminReferrals({
  storeName,
  storeSlug,
}: AdminReferralsProps) {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // Redeem form
  const [referrerPhone, setReferrerPhone] = useState("");
  const [friendName, setFriendName] = useState("");
  const [friendPhone, setFriendPhone] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [friendReward, setFriendReward] = useState<RewardChoice>("gram");
  const [withPurchase, setWithPurchase] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  // Claim form
  const [claimCode, setClaimCode] = useState("");
  const [claimLookup, setClaimLookup] = useState<{
    claimCode: string;
    status: string;
    expiresAt: string;
    referrer: { name: string; phoneDisplay: string; email: string };
  } | null>(null);
  const [claimReward, setClaimReward] = useState<RewardChoice>("gram");
  const [claiming, setClaiming] = useState(false);

  // Lost email fallback
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupResults, setLookupResults] = useState<PendingRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/referrals?storeSlug=${encodeURIComponent(storeSlug)}`,
      );
      if (!response.ok) throw new Error("Failed to load referrals.");
      const data = (await response.json()) as {
        stats: Stats;
        redemptions: RedemptionRow[];
        pending: PendingRow[];
      };
      setStats(data.stats);
      setRedemptions(data.redemptions);
      setPending(data.pending);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load referrals.",
      );
    } finally {
      setLoading(false);
    }
  }, [storeSlug]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRedeem(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    setRedeeming(true);
    try {
      const response = await fetch(
        `/api/referrals/redeem?storeSlug=${encodeURIComponent(storeSlug)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            referrerPhone,
            friendName,
            friendPhone,
            friendEmail,
            rewardChoice: friendReward,
            withPurchase,
          }),
        },
      );
      const data = (await response.json()) as {
        error?: string;
        claimCode?: string;
        referrerEmailSent?: boolean;
        friendEmailSent?: boolean;
      };
      if (!response.ok) throw new Error(data.error || "Redeem failed.");

      setMessage(
        `Redeemed. Claim code ${data.claimCode} emailed to referrer${data.referrerEmailSent ? "" : " (email failed — use Resend)"}. Friend invite${data.friendEmailSent ? " sent" : " failed"}.`,
      );
      setReferrerPhone("");
      setFriendName("");
      setFriendPhone("");
      setFriendEmail("");
      setWithPurchase(false);
      await load();
    } catch (redeemError) {
      setError(
        redeemError instanceof Error ? redeemError.message : "Redeem failed.",
      );
    } finally {
      setRedeeming(false);
    }
  }

  async function lookupClaimCode() {
    setError("");
    setClaimLookup(null);
    const response = await fetch(
      `/api/referrals/claim?storeSlug=${encodeURIComponent(storeSlug)}&code=${encodeURIComponent(claimCode)}`,
    );
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Code not found.");
      return;
    }
    setClaimLookup(data);
  }

  async function handleClaim(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    setClaiming(true);
    try {
      const response = await fetch(
        `/api/referrals/claim?storeSlug=${encodeURIComponent(storeSlug)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            claimCode,
            rewardChoice: claimReward,
          }),
        },
      );
      const data = (await response.json()) as {
        error?: string;
        claimCode?: string;
        referrerName?: string;
      };
      if (!response.ok) throw new Error(data.error || "Claim failed.");
      setMessage(
        `Claimed ${data.claimCode} for ${data.referrerName} — gave ${claimReward === "gram" ? "a gram" : "a THC drink"}.`,
      );
      setClaimCode("");
      setClaimLookup(null);
      await load();
    } catch (claimError) {
      setError(
        claimError instanceof Error ? claimError.message : "Claim failed.",
      );
    } finally {
      setClaiming(false);
    }
  }

  async function searchPendingByPhone() {
    setError("");
    const response = await fetch(
      `/api/referrals?storeSlug=${encodeURIComponent(storeSlug)}&pendingPhone=${encodeURIComponent(lookupPhone)}`,
    );
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Lookup failed.");
      return;
    }
    setLookupResults(data.rewards ?? []);
    if (!data.referrer) setMessage("No referrer found for that phone.");
  }

  async function resendEmails(id: string) {
    setMessage("");
    setError("");
    const response = await fetch(
      `/api/referrals/redemptions/${id}/resend?storeSlug=${encodeURIComponent(storeSlug)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ which: "both" }),
      },
    );
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Resend failed.");
      return;
    }
    setMessage("Emails resent.");
    await load();
  }

  return (
    <div className="dashboard">
      <header className="topbar">
        <div>
          <p className="eyebrow">Referrals</p>
          <h1>{storeName} — Tell your friends</h1>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="logout-button"
            onClick={() => signOut({ callbackUrl: `/store/${storeSlug}/login` })}
          >
            Sign out ({session?.user?.email ?? "admin"})
          </button>
        </div>
      </header>

      {error ? <div className="login-error">{error}</div> : null}
      {message ? <div className="platform-success">{message}</div> : null}

      {loading || !stats ? (
        <p>Loading…</p>
      ) : (
        <div className="refer-stats">
          <div className="refer-stat">
            <strong>{stats.referrers}</strong>
            <span>Referrers</span>
          </div>
          <div className="refer-stat">
            <strong>{stats.redemptionsThisWeek}</strong>
            <span>Redeems this week</span>
          </div>
          <div className="refer-stat">
            <strong>{stats.redemptionsAllTime}</strong>
            <span>Redeems all-time</span>
          </div>
          <div className="refer-stat">
            <strong>{stats.pendingRewards}</strong>
            <span>Pending codes</span>
          </div>
          <div className="refer-stat">
            <strong>{stats.claimedRewards}</strong>
            <span>Claimed</span>
          </div>
          <div className="refer-stat">
            <strong>{stats.expiredRewards}</strong>
            <span>Expired</span>
          </div>
        </div>
      )}

      <div className="refer-admin-grid">
        <section className="platform-card">
          <h2>Redeem friend (with purchase)</h2>
          <form className="platform-form" onSubmit={handleRedeem}>
            <label className="login-field">
              <span>Referrer phone</span>
              <input
                value={referrerPhone}
                onChange={(e) => setReferrerPhone(e.target.value)}
                required
                placeholder="(214) 555-1234"
              />
            </label>
            <label className="login-field">
              <span>Friend name</span>
              <input
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                required
              />
            </label>
            <label className="login-field">
              <span>Friend phone</span>
              <input
                value={friendPhone}
                onChange={(e) => setFriendPhone(e.target.value)}
                required
              />
            </label>
            <label className="login-field">
              <span>Friend email</span>
              <input
                type="email"
                value={friendEmail}
                onChange={(e) => setFriendEmail(e.target.value)}
                required
              />
            </label>
            <label className="login-field">
              <span>Friend reward</span>
              <select
                value={friendReward}
                onChange={(e) =>
                  setFriendReward(e.target.value as RewardChoice)
                }
              >
                <option value="gram">Free gram</option>
                <option value="thc_drink">THC drink</option>
              </select>
            </label>
            <label className="refer-check">
              <input
                type="checkbox"
                checked={withPurchase}
                onChange={(e) => setWithPurchase(e.target.checked)}
                required
              />
              <span>Friend made a purchase</span>
            </label>
            <button className="login-button" type="submit" disabled={redeeming}>
              {redeeming ? "Redeeming…" : "Redeem & email codes"}
            </button>
          </form>
        </section>

        <section className="platform-card">
          <h2>Claim referrer reward</h2>
          <div className="platform-form">
            <label className="login-field">
              <span>Claim code</span>
              <input
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value)}
                placeholder="GJ-XXXXXX"
              />
            </label>
            <button
              type="button"
              className="refer-ghost-btn"
              onClick={lookupClaimCode}
            >
              Look up
            </button>
            {claimLookup ? (
              <div className="refer-claim-preview">
                <p>
                  <strong>{claimLookup.referrer.name}</strong> ·{" "}
                  {claimLookup.referrer.phoneDisplay}
                </p>
                <p>
                  Status: {claimLookup.status} · Expires{" "}
                  {new Date(claimLookup.expiresAt).toLocaleDateString()}
                </p>
              </div>
            ) : null}
            <form onSubmit={handleClaim}>
              <label className="login-field">
                <span>Give them</span>
                <select
                  value={claimReward}
                  onChange={(e) =>
                    setClaimReward(e.target.value as RewardChoice)
                  }
                >
                  <option value="gram">Free gram</option>
                  <option value="thc_drink">THC drink</option>
                </select>
              </label>
              <button className="login-button" type="submit" disabled={claiming}>
                {claiming ? "Claiming…" : "Mark claimed"}
              </button>
            </form>
          </div>

          <hr className="refer-divider" />

          <h3>Lost email? Find pending by phone</h3>
          <div className="platform-form">
            <label className="login-field">
              <span>Referrer phone</span>
              <input
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="refer-ghost-btn"
              onClick={searchPendingByPhone}
            >
              Search
            </button>
            {lookupResults.length > 0 ? (
              <ul className="refer-pending-list">
                {lookupResults.map((r) => (
                  <li key={r.id}>
                    <code>{r.claimCode}</code> · expires{" "}
                    {new Date(r.expiresAt).toLocaleDateString()}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      </div>

      <section className="platform-card">
        <h2>Pending claim codes</h2>
        <div className="platform-table-wrap">
          <table className="platform-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Referrer</th>
                <th>Phone</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((row) => (
                <tr key={row.id}>
                  <td>
                    <code>{row.claimCode}</code>
                  </td>
                  <td>{row.referrerName}</td>
                  <td>{row.referrerPhoneDisplay}</td>
                  <td>{new Date(row.expiresAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={4}>No pending rewards.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="platform-card">
        <h2>Recent redemptions</h2>
        <div className="platform-table-wrap">
          <table className="platform-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Referrer</th>
                <th>Friend</th>
                <th>Friend reward</th>
                <th>Claim code</th>
                <th>Emails</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {redemptions.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.redeemedAt).toLocaleString()}</td>
                  <td>
                    {row.referrerName}
                    <br />
                    <small>{row.referrerPhoneDisplay}</small>
                  </td>
                  <td>
                    {row.friendName}
                    <br />
                    <small>{row.friendEmail}</small>
                  </td>
                  <td>{row.rewardChoice === "gram" ? "Gram" : "THC drink"}</td>
                  <td>
                    <code>{row.claimCode}</code>
                    <br />
                    <small>{row.rewardStatus}</small>
                  </td>
                  <td>
                    <small>
                      Referrer {row.referrerEmailSentAt ? "✓" : "—"} · Friend{" "}
                      {row.friendEmailSentAt ? "✓" : "—"}
                    </small>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="refer-ghost-btn"
                      onClick={() => resendEmails(row.id)}
                    >
                      Resend
                    </button>
                  </td>
                </tr>
              ))}
              {redemptions.length === 0 ? (
                <tr>
                  <td colSpan={7}>No redemptions yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
