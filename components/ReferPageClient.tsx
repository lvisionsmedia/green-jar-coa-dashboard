"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildShareMessage,
  buildShareUrl,
  buildSmsHref,
  getStoreLocations,
  REFERRAL_TERMS,
} from "@/lib/referral-share";
import { formatPhoneFromRefParam } from "@/lib/phone";
import type { RewardChoice } from "@/lib/types";

type ReferPageClientProps = {
  initialRef?: string;
  shareMode?: boolean;
  referrerName?: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillPhone?: string;
};

type SignupSuccess = {
  name: string;
  phoneDisplay: string;
  email: string;
  existing: boolean;
};

type ReserveSuccess = {
  friendName: string;
  rewardChoice: RewardChoice;
  expiresAt: string | null;
  referrerName: string;
};

function StoreLocations() {
  return (
    <section className="refer-locations" aria-label="Store locations">
      <p className="refer-soft-label">Visit us in store</p>
      <ul className="refer-location-list">
        {getStoreLocations().map((loc) => (
          <li key={loc.city}>
            <a
              className="refer-location-link"
              href={loc.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <strong>{loc.city}</strong>
              <span>{loc.line}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function rewardLabel(choice: RewardChoice) {
  return choice === "gram" ? "free gram" : "free THC drink";
}

export function ReferPageClient({
  initialRef = "",
  shareMode = false,
  referrerName = "",
  prefillName = "",
  prefillEmail = "",
  prefillPhone = "",
}: ReferPageClientProps) {
  const router = useRouter();
  const referralCodeDisplay = useMemo(
    () => (initialRef ? formatPhoneFromRefParam(initialRef) : null),
    [initialRef],
  );

  const [name, setName] = useState(prefillName);
  const [email, setEmail] = useState(prefillEmail);
  const [phone, setPhone] = useState(prefillPhone);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<SignupSuccess | null>(null);
  const [copied, setCopied] = useState("");

  const [friendName, setFriendName] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [friendPhone, setFriendPhone] = useState("");
  const [rewardChoice, setRewardChoice] = useState<RewardChoice>("gram");
  const [friendAgeConfirmed, setFriendAgeConfirmed] = useState(false);
  const [friendHoneypot, setFriendHoneypot] = useState("");
  const [reserving, setReserving] = useState(false);
  const [reserveSuccess, setReserveSuccess] = useState<ReserveSuccess | null>(
    null,
  );

  const refShareBundle = useMemo(() => {
    if (!referralCodeDisplay || !initialRef) return null;
    const shareUrl = buildShareUrl(initialRef);
    const message = buildShareMessage(
      referralCodeDisplay,
      shareUrl,
      referrerName || undefined,
    );
    return {
      shareUrl,
      message,
      smsHref: buildSmsHref(message),
    };
  }, [referralCodeDisplay, initialRef, referrerName]);

  function resetToSignup() {
    setSuccess(null);
    setName("");
    setEmail("");
    setPhone("");
    setAgeConfirmed(false);
    setHoneypot("");
    setError("");
    setCopied("");
    router.replace("/refer");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/referrals/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          ageConfirmed,
          website: honeypot,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        referrer?: {
          name: string;
          phoneDisplay: string;
          phoneE164: string;
        };
        existing?: boolean;
      };

      if (!response.ok || !data.referrer) {
        throw new Error(data.error || "Could not sign up. Try again.");
      }

      setSuccess({
        name: data.referrer.name,
        phoneDisplay: data.referrer.phoneDisplay,
        email: email.trim(),
        existing: Boolean(data.existing),
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not sign up. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleReserve(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setReserving(true);
    try {
      const response = await fetch("/api/referrals/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referrerPhone: referralCodeDisplay || initialRef,
          friendName,
          friendPhone,
          friendEmail,
          rewardChoice,
          ageConfirmed: friendAgeConfirmed,
          website: friendHoneypot,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        rewardChoice?: RewardChoice;
        expiresAt?: string | null;
        referrerName?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Could not reserve. Try again.");
      }
      setReserveSuccess({
        friendName: friendName.trim(),
        rewardChoice: data.rewardChoice ?? rewardChoice,
        expiresAt: data.expiresAt ?? null,
        referrerName: data.referrerName || referrerName || "your friend",
      });
    } catch (reserveError) {
      setError(
        reserveError instanceof Error
          ? reserveError.message
          : "Could not reserve. Try again.",
      );
    } finally {
      setReserving(false);
    }
  }

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("");
    }
  }

  if (!shareMode && referralCodeDisplay && reserveSuccess) {
    return (
      <div className="refer-shell">
        <header className="refer-topbar">
          <span className="refer-brand">The Green Jar</span>
          <span className="refer-topbar-pill">You’re reserved</span>
        </header>
        <main className="refer-main">
          <section className="refer-panel refer-panel-narrow">
            <p className="refer-kicker">Come to the store</p>
            <h1 className="refer-title">
              Thanks, {reserveSuccess.friendName} — your{" "}
              {rewardLabel(reserveSuccess.rewardChoice)} is waiting
            </h1>
            <p className="refer-subtitle">
              Visit The Green Jar, make a purchase, and give the budtender{" "}
              <strong>your phone number</strong>. They’ll look you up and hand
              over your reward from {reserveSuccess.referrerName}.
            </p>
            {reserveSuccess.expiresAt ? (
              <p className="refer-terms">
                Held through{" "}
                {new Date(reserveSuccess.expiresAt).toLocaleDateString()} · 21+
                only
              </p>
            ) : (
              <p className="refer-terms">Held for 30 days · 21+ only</p>
            )}
            <StoreLocations />
          </section>
        </main>
      </div>
    );
  }

  if (!shareMode && referralCodeDisplay) {
    const inviter = referrerName.trim() || "A friend";
    return (
      <div className="refer-shell">
        <header className="refer-topbar">
          <span className="refer-brand">The Green Jar</span>
          <span className="refer-topbar-pill">You’re invited</span>
        </header>
        <main className="refer-main">
          <section className="refer-hero">
            <p className="refer-kicker">Free with purchase</p>
            <h1 className="refer-title">
              {inviter} asked you to come to The Green Jar
            </h1>
            <p className="refer-subtitle">
              Pick your freebie, reserve it here, then visit the store and show
              your phone at the register.
            </p>
          </section>

          <aside className="refer-friend-callout" aria-live="polite">
            <p className="refer-soft-label">Invited by</p>
            <p className="refer-phone-display">{referralCodeDisplay}</p>
            <p>{inviter} · their number is your referral code</p>
          </aside>

          <ol className="refer-steps">
            <li>
              <strong>1</strong>
              <span>Choose gram or THC drink &amp; reserve</span>
            </li>
            <li>
              <strong>2</strong>
              <span>Visit a Green Jar store and make a purchase</span>
            </li>
            <li>
              <strong>3</strong>
              <span>Give your phone to the budtender</span>
            </li>
          </ol>

          <section className="refer-panel">
            <h2 className="refer-panel-title">Reserve your freebie</h2>
            <p className="refer-panel-lead">
              Takes about a minute. We’ll email a confirmation so you’re ready
              at the counter.
            </p>

            {error ? <div className="refer-error">{error}</div> : null}

            <form className="refer-form" onSubmit={handleReserve}>
              <fieldset className="refer-reward-fieldset">
                <legend>Choose your reward</legend>
                <div className="refer-reward-choices" role="radiogroup">
                  <label
                    className={
                      rewardChoice === "gram"
                        ? "refer-reward-choice is-selected"
                        : "refer-reward-choice"
                    }
                  >
                    <input
                      type="radio"
                      name="rewardChoice"
                      value="gram"
                      checked={rewardChoice === "gram"}
                      onChange={() => setRewardChoice("gram")}
                    />
                    <span>
                      <strong>Free gram</strong>
                      <em>Flower · with purchase</em>
                    </span>
                  </label>
                  <label
                    className={
                      rewardChoice === "thc_drink"
                        ? "refer-reward-choice is-selected"
                        : "refer-reward-choice"
                    }
                  >
                    <input
                      type="radio"
                      name="rewardChoice"
                      value="thc_drink"
                      checked={rewardChoice === "thc_drink"}
                      onChange={() => setRewardChoice("thc_drink")}
                    />
                    <span>
                      <strong>THC drink</strong>
                      <em>Beverage · with purchase</em>
                    </span>
                  </label>
                </div>
              </fieldset>

              <label className="refer-field">
                <span>Your name</span>
                <input
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Jordan Lee"
                />
              </label>
              <label className="refer-field">
                <span>Your email</span>
                <input
                  type="email"
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@email.com"
                />
              </label>
              <label className="refer-field">
                <span>Your phone — show this at the register</span>
                <input
                  type="tel"
                  value={friendPhone}
                  onChange={(e) => setFriendPhone(e.target.value)}
                  required
                  autoComplete="tel"
                  placeholder="(214) 555-1234"
                />
              </label>

              <label aria-hidden="true" className="refer-honeypot">
                Website
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={friendHoneypot}
                  onChange={(e) => setFriendHoneypot(e.target.value)}
                />
              </label>

              <label className="refer-check">
                <input
                  type="checkbox"
                  checked={friendAgeConfirmed}
                  onChange={(e) => setFriendAgeConfirmed(e.target.checked)}
                  required
                />
                <span>I confirm I am 21 or older</span>
              </label>

              <button
                className="refer-btn-primary"
                type="submit"
                disabled={reserving}
              >
                {reserving
                  ? "Reserving…"
                  : `Reserve my ${rewardLabel(rewardChoice)}`}
              </button>
            </form>

            <p className="refer-terms">{REFERRAL_TERMS}</p>
            <StoreLocations />
          </section>
        </main>
      </div>
    );
  }

  if (shareMode && refShareBundle && referralCodeDisplay) {
    return (
      <div className="refer-shell">
        <header className="refer-topbar">
          <span className="refer-brand">The Green Jar</span>
          <span className="refer-topbar-pill">Tell your friends</span>
        </header>
        <main className="refer-main">
          <section className="refer-panel refer-panel-narrow">
            <p className="refer-kicker">Ready to share</p>
            <h1 className="refer-title">Text your friends</h1>
            <p className="refer-subtitle">
              Opens Messages with a prefilled invite. Friends open your link,
              pick a freebie, and reserve — then redeem in store with their
              phone. Your number is <strong>{referralCodeDisplay}</strong>.
            </p>
            <a className="refer-btn-primary" href={refShareBundle.smsHref}>
              Text your friends
            </a>
            <div className="refer-link-row">
              <input
                readOnly
                value={refShareBundle.shareUrl}
                aria-label="Share link"
              />
              <button
                type="button"
                className="refer-btn-secondary"
                onClick={() => copyText("link", refShareBundle.shareUrl)}
              >
                {copied === "link" ? "Copied" : "Copy link"}
              </button>
            </div>
            <button
              type="button"
              className="refer-btn-ghost"
              onClick={() => copyText("message", refShareBundle.message)}
            >
              {copied === "message" ? "Message copied" : "Copy full message"}
            </button>
            <p className="refer-terms">{REFERRAL_TERMS}</p>
            <StoreLocations />
          </section>
        </main>
      </div>
    );
  }

  if (success) {
    return (
      <div className="refer-shell">
        <header className="refer-topbar">
          <span className="refer-brand">The Green Jar</span>
          <span className="refer-topbar-pill">You’re in</span>
        </header>
        <main className="refer-main">
          <section className="refer-panel refer-panel-narrow">
            <p className="refer-kicker">
              {success.existing ? "Welcome back" : "You’re signed up"}
            </p>
            <h1 className="refer-title">
              Thanks, {success.name} — check your email
            </h1>
            <p className="refer-subtitle">
              We sent everything to <strong>{success.email}</strong> — including
              a Text your friends button. Friends reserve online, then redeem in
              store. Your number <strong>{success.phoneDisplay}</strong> is the
              referral code.
            </p>

            <div className="refer-soft-card refer-success-note">
              <p className="refer-soft-label">Your referral code</p>
              <p className="refer-phone-display">{success.phoneDisplay}</p>
              <p className="refer-success-hint">
                When a friend redeems with a purchase, you’ll get a unique claim
                code by email for your free THC drink or gram.
              </p>
            </div>

            <button
              type="button"
              className="refer-btn-primary refer-btn-finished"
              onClick={resetToSignup}
            >
              Finished
            </button>
            <p className="refer-terms">{REFERRAL_TERMS}</p>
            <StoreLocations />
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="refer-shell">
      <header className="refer-topbar">
        <span className="refer-brand">The Green Jar</span>
        <span className="refer-topbar-pill">21+ · In-store rewards</span>
      </header>

      <main className="refer-main">
        <section className="refer-hero">
          <p className="refer-kicker">Tell your friends</p>
          <h1 className="refer-title">
            Share your number. Get a free THC drink or a gram on us.
          </h1>
          <p className="refer-subtitle">
            Sign up here. We’ll email your share kit. Friends reserve a freebie
            online — you get a unique claim code when they redeem in store.
          </p>

          <div className="refer-offer-row" aria-label="Offer summary">
            <div className="refer-offer-chip">
              <span>Friends get</span>
              <strong>Free gram or THC drink</strong>
              <em>with purchase</em>
            </div>
            <div className="refer-offer-chip refer-offer-chip-you">
              <span>You get</span>
              <strong>Unique claim code</strong>
              <em>after they redeem</em>
            </div>
          </div>
        </section>

        <ol className="refer-steps">
          <li>
            <strong>1</strong>
            <span>Sign up with your name, email &amp; phone</span>
          </li>
          <li>
            <strong>2</strong>
            <span>Open the share kit we email you</span>
          </li>
          <li>
            <strong>3</strong>
            <span>Friends reserve &amp; redeem · you get a claim code</span>
          </li>
        </ol>

        <section className="refer-panel">
          <h2 className="refer-panel-title">Sign up to refer</h2>
          <p className="refer-panel-lead">
            Takes about 30 seconds. Your share kit arrives by email after you
            submit.
          </p>

          {error ? <div className="refer-error">{error}</div> : null}

          <form className="refer-form" onSubmit={handleSubmit}>
            <label className="refer-field">
              <span>Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder="Alex Rivera"
              />
            </label>
            <label className="refer-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@email.com"
              />
            </label>
            <label className="refer-field">
              <span>Phone — your referral code</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
                placeholder="(214) 555-1234"
              />
            </label>

            <label aria-hidden="true" className="refer-honeypot">
              Website
              <input
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </label>

            <label className="refer-check">
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                required
              />
              <span>I confirm I am 21 or older</span>
            </label>

            <button
              className="refer-btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing up…" : "Sign up"}
            </button>
          </form>

          <p className="refer-terms">{REFERRAL_TERMS}</p>
          <StoreLocations />
        </section>
      </main>
    </div>
  );
}
