export type NormalizedPhone = {
  e164: string;
  display: string;
  digits10: string;
};

/** Normalize a US phone to E.164 (+1XXXXXXXXXX) and a display form. */
export function normalizeUsPhone(input: string): NormalizedPhone | null {
  const digits = input.replace(/\D/g, "");
  let ten = digits;

  if (digits.length === 11 && digits.startsWith("1")) {
    ten = digits.slice(1);
  }

  if (ten.length !== 10) {
    return null;
  }

  // Reject clearly invalid area/exchange codes (NXX — first digit 2–9).
  if (ten[0] === "0" || ten[0] === "1" || ten[3] === "0" || ten[3] === "1") {
    return null;
  }

  return {
    e164: `+1${ten}`,
    display: `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`,
    digits10: ten,
  };
}

/** Format digits from a URL ?ref= param without DB lookup. */
export function formatPhoneFromRefParam(ref: string): string | null {
  const normalized = normalizeUsPhone(ref);
  return normalized?.display ?? null;
}

export function phonesEqual(a: string, b: string): boolean {
  const left = normalizeUsPhone(a);
  const right = normalizeUsPhone(b);
  if (!left || !right) return false;
  return left.e164 === right.e164;
}
