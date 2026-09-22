import { NextResponse } from "next/server";
import { sendWeeklyProgressEmail } from "@/lib/email/referral";
import {
  expireOverdueRewards,
  getReferrerProgress,
  listWeeklyEmailCandidates,
  markWeeklyEmailSent,
  purgeOldSignupAttempts,
} from "@/lib/referrals";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const expired = await expireOverdueRewards();
    await purgeOldSignupAttempts();

    const candidates = await listWeeklyEmailCandidates(500);
    let sent = 0;
    let failed = 0;

    for (const referrer of candidates) {
      const progress = await getReferrerProgress(referrer.id);
      const result = await sendWeeklyProgressEmail({
        to: referrer.email,
        name: referrer.name,
        phoneDisplay: referrer.phoneDisplay,
        phoneE164: referrer.phoneE164,
        unsubscribeToken: referrer.unsubscribeToken,
        friendsRedeemed: progress.friendsRedeemed,
        pendingCodes: progress.pendingCodes,
        claimedRewards: progress.claimedRewards,
      });

      if (result.ok) {
        await markWeeklyEmailSent(referrer.id);
        sent += 1;
      } else {
        failed += 1;
        console.error(
          `Weekly email failed for ${referrer.id}:`,
          result.error,
        );
      }
    }

    return NextResponse.json({
      ok: true,
      candidates: candidates.length,
      sent,
      failed,
      expired,
    });
  } catch (error) {
    console.error("GET /api/cron/referral-weekly failed:", error);
    return NextResponse.json(
      { error: "Cron job failed." },
      { status: 500 },
    );
  }
}
