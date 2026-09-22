import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  sendBecomeReferrerEmail,
  sendClaimCodeEmail,
} from "@/lib/email/referral";
import {
  markRedemptionEmailSent,
  redeemFriendReferral,
} from "@/lib/referrals";
import { resolveRequestTenant } from "@/lib/request-tenant";
import {
  getSessionRole,
  getSessionStoreId,
  resolveWritableStoreId,
} from "@/lib/session-access";
import type { RewardChoice } from "@/lib/types";

export const runtime = "nodejs";

type RedeemBody = {
  referrerPhone?: string;
  friendName?: string;
  friendPhone?: string;
  friendEmail?: string;
  rewardChoice?: RewardChoice;
  withPurchase?: boolean;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenant = await resolveRequestTenant(request);
    const storeId = resolveWritableStoreId(session, tenant.store?.id ?? null);
    if (!storeId) {
      return NextResponse.json(
        { error: "Store context required. Pass storeSlug." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as RedeemBody;
    if (!body.withPurchase) {
      return NextResponse.json(
        { error: "Confirm the friend made a purchase." },
        { status: 400 },
      );
    }

    if (
      body.rewardChoice !== "gram" &&
      body.rewardChoice !== "thc_drink"
    ) {
      return NextResponse.json(
        { error: "Select gram or THC drink for the friend." },
        { status: 400 },
      );
    }

    const role = getSessionRole(session);
    const redeemedBy =
      role === "platform"
        ? "platform"
        : getSessionStoreId(session) || session.user?.email || "store";

    const result = await redeemFriendReferral({
      storeId,
      referrerPhone: body.referrerPhone ?? "",
      friendName: body.friendName ?? "",
      friendPhone: body.friendPhone ?? "",
      friendEmail: body.friendEmail ?? "",
      rewardChoice: body.rewardChoice,
      redeemedBy,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: 400 },
      );
    }

    const claimEmail = await sendClaimCodeEmail({
      to: result.referrer.email,
      name: result.referrer.name,
      claimCode: result.reward.claimCode,
      unsubscribeToken: result.referrer.unsubscribeToken,
    });

    const friendEmail = await sendBecomeReferrerEmail({
      to: result.redemption.friendEmail,
      friendName: result.redemption.friendName,
      prefill: {
        name: result.redemption.friendName,
        email: result.redemption.friendEmail,
        phone: result.redemption.friendPhoneE164,
      },
    });

    if (claimEmail.ok) {
      await markRedemptionEmailSent(result.redemption.id, "referrer");
    }
    if (friendEmail.ok) {
      await markRedemptionEmailSent(result.redemption.id, "friend");
    }

    return NextResponse.json({
      ok: true,
      claimCode: result.reward.claimCode,
      redemptionId: result.redemption.id,
      referrerEmailSent: claimEmail.ok,
      friendEmailSent: friendEmail.ok,
      referrerEmailError: claimEmail.ok ? null : claimEmail.error,
      friendEmailError: friendEmail.ok ? null : friendEmail.error,
    });
  } catch (error) {
    console.error("POST /api/referrals/redeem failed:", error);
    return NextResponse.json(
      { error: "Failed to redeem referral." },
      { status: 500 },
    );
  }
}
