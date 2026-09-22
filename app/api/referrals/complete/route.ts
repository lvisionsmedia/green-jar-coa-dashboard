import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  sendBecomeReferrerEmail,
  sendClaimCodeEmail,
} from "@/lib/email/referral";
import {
  completeReservedRedemption,
  findReservedByFriendPhone,
  markRedemptionEmailSent,
} from "@/lib/referrals";
import { resolveRequestTenant } from "@/lib/request-tenant";
import {
  getSessionRole,
  getSessionStoreId,
  resolveWritableStoreId,
} from "@/lib/session-access";
import type { RewardChoice } from "@/lib/types";

export const runtime = "nodejs";

type CompleteBody = {
  redemptionId?: string;
  friendPhone?: string;
  rewardChoice?: RewardChoice;
  withPurchase?: boolean;
};

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const friendPhone = searchParams.get("friendPhone");
    if (!friendPhone) {
      return NextResponse.json(
        { error: "Friend phone required." },
        { status: 400 },
      );
    }

    const found = await findReservedByFriendPhone(storeId, friendPhone);
    if (!found || found.redemption.status !== "reserved") {
      return NextResponse.json(
        { error: "No open reservation for that phone." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      redemption: found.redemption,
      referrer: {
        name: found.referrer.name,
        phoneDisplay: found.referrer.phoneDisplay,
        email: found.referrer.email,
      },
    });
  } catch (error) {
    console.error("GET /api/referrals/complete failed:", error);
    return NextResponse.json(
      { error: "Failed to look up reservation." },
      { status: 500 },
    );
  }
}

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

    const body = (await request.json()) as CompleteBody;
    if (!body.withPurchase) {
      return NextResponse.json(
        { error: "Confirm the friend made a purchase." },
        { status: 400 },
      );
    }

    let redemptionId = body.redemptionId?.trim() ?? "";
    if (!redemptionId && body.friendPhone) {
      const found = await findReservedByFriendPhone(storeId, body.friendPhone);
      if (!found || found.redemption.status !== "reserved") {
        return NextResponse.json(
          { error: "No open reservation for that phone." },
          { status: 404 },
        );
      }
      redemptionId = found.redemption.id;
    }

    if (!redemptionId) {
      return NextResponse.json(
        { error: "Reservation id or friend phone required." },
        { status: 400 },
      );
    }

    const role = getSessionRole(session);
    const redeemedBy =
      role === "platform"
        ? "platform"
        : getSessionStoreId(session) || session.user?.email || "store";

    const result = await completeReservedRedemption({
      storeId,
      redemptionId,
      redeemedBy,
      rewardChoice: body.rewardChoice,
      withPurchase: true,
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
      rewardChoice: result.redemption.rewardChoice,
      referrerEmailSent: claimEmail.ok,
      friendEmailSent: friendEmail.ok,
      referrerEmailError: claimEmail.ok ? null : claimEmail.error,
      friendEmailError: friendEmail.ok ? null : friendEmail.error,
    });
  } catch (error) {
    console.error("POST /api/referrals/complete failed:", error);
    return NextResponse.json(
      { error: "Failed to complete reservation." },
      { status: 500 },
    );
  }
}
