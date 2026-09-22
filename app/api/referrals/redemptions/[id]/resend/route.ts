import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  sendBecomeReferrerEmail,
  sendClaimCodeEmail,
} from "@/lib/email/referral";
import {
  getRedemptionWithDetails,
  markRedemptionEmailSent,
} from "@/lib/referrals";
import { resolveRequestTenant } from "@/lib/request-tenant";
import { resolveWritableStoreId } from "@/lib/session-access";

export const runtime = "nodejs";

type ResendBody = {
  which?: "referrer" | "friend" | "both";
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const tenant = await resolveRequestTenant(request);
    const storeId = resolveWritableStoreId(session, tenant.store?.id ?? null);
    if (!storeId) {
      return NextResponse.json(
        { error: "Store context required. Pass storeSlug." },
        { status: 400 },
      );
    }

    const details = await getRedemptionWithDetails(id, storeId);
    if (!details) {
      return NextResponse.json(
        { error: "Redemption not found." },
        { status: 404 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as ResendBody;
    const which = body.which ?? "both";

    let referrerEmailSent = false;
    let friendEmailSent = false;
    let referrerError: string | null = null;
    let friendError: string | null = null;

    if (which === "referrer" || which === "both") {
      const result = await sendClaimCodeEmail({
        to: details.referrer.email,
        name: details.referrer.name,
        claimCode: details.reward.claimCode,
        unsubscribeToken: details.referrer.unsubscribeToken,
      });
      if (result.ok) {
        referrerEmailSent = true;
        await markRedemptionEmailSent(id, "referrer");
      } else {
        referrerError = result.error;
      }
    }

    if (which === "friend" || which === "both") {
      if (details.referrer.emailOptOutAt) {
        // Friend invite is marketing — still send to friend (they're not opted out as referrer yet)
      }
      const result = await sendBecomeReferrerEmail({
        to: details.redemption.friendEmail,
        friendName: details.redemption.friendName,
        prefill: {
          name: details.redemption.friendName,
          email: details.redemption.friendEmail,
          phone: details.redemption.friendPhoneE164,
        },
      });
      if (result.ok) {
        friendEmailSent = true;
        await markRedemptionEmailSent(id, "friend");
      } else {
        friendError = result.error;
      }
    }

    return NextResponse.json({
      ok: true,
      referrerEmailSent,
      friendEmailSent,
      referrerError,
      friendError,
    });
  } catch (error) {
    console.error("POST /api/referrals/redemptions/[id]/resend failed:", error);
    return NextResponse.json(
      { error: "Failed to resend email." },
      { status: 500 },
    );
  }
}
