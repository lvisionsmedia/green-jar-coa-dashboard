const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateClaimCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let body = "";
  for (let i = 0; i < 6; i += 1) {
    body += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return `GJ-${body}`;
}

/** Uppercase and strip spaces/dashes for lookup (keeps GJ prefix + body). */
export function normalizeClaimCode(input: string): string {
  const cleaned = input
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");

  if (cleaned.startsWith("GJ") && cleaned.length === 8) {
    return `GJ-${cleaned.slice(2)}`;
  }

  if (/^[A-Z0-9]{6}$/.test(cleaned)) {
    return `GJ-${cleaned}`;
  }

  // Already formatted GJ-XXXXXX
  const withDash = input.trim().toUpperCase().replace(/\s+/g, "");
  if (/^GJ-[A-Z0-9]{6}$/.test(withDash)) {
    return withDash;
  }

  return withDash;
}
