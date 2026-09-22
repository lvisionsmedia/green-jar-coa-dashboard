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

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("");
    }
  }

  // Friend invite: link from SMS / shared URL — redeem instructions only
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
              Get a free gram or THC drink when you buy something. Here’s how to
              redeem at the register.
            </p>
          </section>

          <aside className="refer-friend-callout" aria-live="polite">
            <p className="refer-soft-label">Referral code (their number)</p>
            <p className="refer-phone-display">{referralCodeDisplay}</p>
            <p>
              Give this number to the budtender along with your phone and email.
            </p>
          </aside>

          <ol className="refer-steps">
            <li>
              <strong>1</strong>
              <span>Visit a Green Jar store and make a purchase</span>
            </li>
            <li>
              <strong>2</strong>
              <span>
                At the register, give your phone, email, and this referral code
              </span>
            </li>
            <li>
              <strong>3</strong>
              <span>Choose your free gram or THC drink</span>
            </li>
          </ol>

          <section className="refer-panel refer-panel-narrow">
            <h2 className="refer-panel-title">What to tell the budtender</h2>
            <p className="refer-panel-lead">
              Your phone number, your email, and{" "}
              <strong>{referralCodeDisplay}</strong> as the referral code
              {referrerName.trim() ? ` (from ${referrerName.trim()})` : ""}.
            </p>
            <p className="refer-terms">{REFERRAL_TERMS}</p>
            <StoreLocations />
          </section>
        </main>
      </div>
    );
  }

  // Referrer share kit (from email CTA)
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
              Opens Messages with a prefilled invite. Friends redeem in store
              using your number <strong>{referralCodeDisplay}</strong> as the
              referral code.
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
              a Text your friends button. Friends use your number{" "}
              <strong>{success.phoneDisplay}</strong> as the referral code at
              checkout.
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
            Sign up here. We’ll email your share kit. Friends get a freebie with
            purchase — you get a unique claim code when they redeem.
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
            <span>Friends redeem in-store · you get a claim code</span>
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
