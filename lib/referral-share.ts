export function getReferralBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_REFERRAL_URL?.replace(/\/$/, "");
  if (explicit) return explicit;

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (site) return `${site}/refer`;

  return "https://refer.thegreenjar.xyz";
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

export function getStoreAddressLines(): string[] {
  return [
    "The Green Jar",
    "Come visit us in store for redemption.",
    "21+ only · While supplies last",
  ];
}

export const REFERRAL_TERMS =
  "21+ only. Friend reward requires a purchase. One referral per new customer. In-store only. While supplies last. The Green Jar may modify or end this program at any time.";
