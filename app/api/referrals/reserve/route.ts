import { NextResponse } from "next/server";
import { sendFriendReservationEmail } from "@/lib/email/referral";
import { getReferralStoreSlug } from "@/lib/referral-share";
import {
  countSignupAttempts,
  getReferralStoreId,
  recordSignupAttempt,
  reserveFriendReferral,
} from "@/lib/referrals";
import type { RewardChoice } from "@/lib/types";

export const runtime = "nodejs";

type ReserveBody = {
  referrerPhone?: string;
  friendName?: string;
  friendPhone?: string;
  friendEmail?: string;
  rewardChoice?: RewardChoice;
  ageConfirmed?: boolean;
  website?: string;
};

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReserveBody;

    if (body.website && body.website.trim()) {
      return NextResponse.json({ ok: true });
    }

    if (!body.ageConfirmed) {
      return NextResponse.json(
        { error: "You must confirm you are 21 or older." },
        { status: 400 },
      );
    }

    const ip = clientIp(request);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const attempts = await countSignupAttempts(ip, hourAgo);
    if (attempts >= 8) {
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

    const result = await reserveFriendReferral({
      storeId,
      referrerPhone: body.referrerPhone ?? "",
      friendName: body.friendName ?? "",
      friendPhone: body.friendPhone ?? "",
      friendEmail: body.friendEmail ?? "",
      rewardChoice: body.rewardChoice as RewardChoice,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: 400 },
      );
    }

    const emailResult = await sendFriendReservationEmail({
      to: result.redemption.friendEmail,
      friendName: result.redemption.friendName,
      rewardChoice: result.redemption.rewardChoice,
      referrerName: result.referrer.name,
      expiresAt: result.redemption.expiresAt,
    });

    if (!emailResult.ok) {
      console.error("Reservation email failed:", emailResult.error);
    }

    return NextResponse.json({
      ok: true,
      redemptionId: result.redemption.id,
      rewardChoice: result.redemption.rewardChoice,
      expiresAt: result.redemption.expiresAt,
      emailSent: emailResult.ok,
      referrerName: result.referrer.name,
    });
  } catch (error) {
    console.error("POST /api/referrals/reserve failed:", error);
    return NextResponse.json(
      { error: "Could not reserve. Try again." },
      { status: 500 },
    );
  }
}
