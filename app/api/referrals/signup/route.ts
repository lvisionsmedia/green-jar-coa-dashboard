import { NextResponse } from "next/server";
import { sendSignupConfirmationEmail } from "@/lib/email/referral";
import { normalizeUsPhone } from "@/lib/phone";
import { getReferralStoreSlug } from "@/lib/referral-share";
import {
  countSignupAttempts,
  createReferrer,
  findReferrerByEmailOrPhone,
  getReferralStoreId,
  recordSignupAttempt,
} from "@/lib/referrals";

export const runtime = "nodejs";

type SignupBody = {
  name?: string;
  email?: string;
  phone?: string;
  ageConfirmed?: boolean;
  website?: string; // honeypot
};

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignupBody;

    // Honeypot — silently pretend success
    if (body.website && body.website.trim()) {
      return NextResponse.json({ ok: true, existing: false });
    }

    if (!body.ageConfirmed) {
      return NextResponse.json(
        { error: "You must confirm you are 21 or older." },
        { status: 400 },
      );
    }

    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const phoneRaw = body.phone?.trim() ?? "";

    if (!name || !email || !phoneRaw) {
      return NextResponse.json(
        { error: "Name, email, and phone are required." },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }

    const phone = normalizeUsPhone(phoneRaw);
    if (!phone) {
      return NextResponse.json(
        { error: "Enter a valid US phone number." },
        { status: 400 },
      );
    }

    const ip = clientIp(request);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const attempts = await countSignupAttempts(ip, hourAgo);
    if (attempts >= 5) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429 },
      );
    }
    await recordSignupAttempt(ip);

    const storeId = await getReferralStoreId(getReferralStoreSlug());
    if (!storeId) {
      return NextResponse.json(
        { error: "Referral program is not configured." },
        { status: 500 },
      );
    }

    const existing = await findReferrerByEmailOrPhone(
      storeId,
      email,
      phone.e164,
    );

    if (existing) {
      // Conflict if email matches one person and phone another
      if (existing.email !== email && existing.phoneE164 === phone.e164) {
        return NextResponse.json(
          {
            error:
              "That phone is already registered with a different email. Use your original email, or contact the store.",
          },
          { status: 409 },
        );
      }
      if (existing.phoneE164 !== phone.e164 && existing.email === email) {
        return NextResponse.json(
          {
            error:
              "That email is already registered with a different phone. Use your original number, or contact the store.",
          },
          { status: 409 },
        );
      }

      // Same identity — return existing share kit (optionally re-send email)
      void sendSignupConfirmationEmail({
        to: existing.email,
        name: existing.name,
        phoneDisplay: existing.phoneDisplay,
        phoneE164: existing.phoneE164,
        unsubscribeToken: existing.unsubscribeToken,
      });

      return NextResponse.json({
        ok: true,
        existing: true,
        referrer: {
          name: existing.name,
          phoneDisplay: existing.phoneDisplay,
          phoneE164: existing.phoneE164,
        },
      });
    }

    const referrer = await createReferrer({
      storeId,
      name,
      email,
      phoneE164: phone.e164,
      phoneDisplay: phone.display,
      signupIp: ip === "unknown" ? null : ip,
    });

    const emailResult = await sendSignupConfirmationEmail({
      to: referrer.email,
      name: referrer.name,
      phoneDisplay: referrer.phoneDisplay,
      phoneE164: referrer.phoneE164,
      unsubscribeToken: referrer.unsubscribeToken,
    });

    if (!emailResult.ok) {
      console.error("Signup email failed:", emailResult.error);
    }

    return NextResponse.json({
      ok: true,
      existing: false,
      referrer: {
        name: referrer.name,
        phoneDisplay: referrer.phoneDisplay,
        phoneE164: referrer.phoneE164,
      },
    });
  } catch (error) {
    console.error("POST /api/referrals/signup failed:", error);
    return NextResponse.json(
      { error: "Could not complete signup. Try again." },
      { status: 500 },
    );
  }
}
