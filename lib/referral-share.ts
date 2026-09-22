const CANONICAL_REFERRAL_URL = "https://refer.thegreenjar.xyz";

function looksLocal(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".localhost")
    );
  } catch {
    return /localhost|127\.0\.0\.1/i.test(url);
  }
}

function isDeployedRuntime(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.VERCEL === "1" ||
    process.env.NODE_ENV === "production"
  );
}

/**
 * Public origin for referral share links (SMS, email, copy).
 * Never returns localhost on a deployed build — that was leaking into
 * "Text a friend" messages when NEXT_PUBLIC_* pointed at local or was unset.
 */
export function getReferralBaseUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_REFERRAL_URL,
    process.env.REFERRAL_BASE_URL,
  ];

  for (const raw of candidates) {
    const value = raw?.trim().replace(/\/$/, "");
    if (!value) continue;
    if (looksLocal(value) && isDeployedRuntime()) continue;
    return value;
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (site && !(looksLocal(site) && isDeployedRuntime())) {
    return `${site}/refer`;
  }

  if (isDeployedRuntime()) {
    return CANONICAL_REFERRAL_URL;
  }

  return site ? `${site}/refer` : "http://localhost:3000/refer";
}

export function getReferralStoreSlug(): string {
  return (process.env.REFERRAL_STORE_SLUG ?? "green-jar").trim().toLowerCase();
}

export function buildShareUrl(phoneDigitsOrE164: string): string {
  const digits = phoneDigitsOrE164.replace(/\D/g, "");
  const ten =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return `${getReferralBaseUrl()}/?ref=${ten}`;
}

export function buildSharePageUrl(phoneDigitsOrE164: string): string {
  const digits = phoneDigitsOrE164.replace(/\D/g, "");
  const ten =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return `${getReferralBaseUrl()}/?share=1&ref=${ten}`;
}

export function buildShareMessage(displayPhone: string, shareUrl: string): string {
  return `Hey! Grab a free THC drink or free gram with purchase at The Green Jar — just tell them my number ${displayPhone} at checkout. Details: ${shareUrl}`;
}

/** iOS + Android friendly sms: link with prefilled body (no recipient). */
export function buildSmsHref(message: string): string {
  return `sms:?&body=${encodeURIComponent(message)}`;
}

export type StoreLocation = {
  city: string;
  line: string;
  mapsUrl: string;
};

function mapsSearchUrl(query: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(query)}`;
}

export function getStoreLocations(): StoreLocation[] {
  const dallas = "5012 East Grand Ave, Dallas, TX 75223";
  const fortWorth = "6700 Brentwood Stair Rd, Fort Worth, TX 76112";
  return [
    {
      city: "Dallas",
      line: dallas,
      mapsUrl: mapsSearchUrl(dallas),
    },
    {
      city: "Fort Worth",
      line: fortWorth,
      mapsUrl: mapsSearchUrl(fortWorth),
    },
  ];
}

export function getStoreAddressLines(): string[] {
  return [
    "The Green Jar",
    ...getStoreLocations().map((loc) => `${loc.city} — ${loc.line}`),
    "21+ only · While supplies last",
  ];
}

export const REFERRAL_TERMS =
  "21+ only. Friend reward requires a purchase. One referral per new customer. In-store only. While supplies last. The Green Jar may modify or end this program at any time.";
