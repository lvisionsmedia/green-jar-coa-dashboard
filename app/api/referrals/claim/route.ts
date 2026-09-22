import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  claimReferrerReward,
  getRewardByClaimCode,
} from "@/lib/referrals";
import { resolveRequestTenant } from "@/lib/request-tenant";
import {
  getSessionRole,
  getSessionStoreId,
  resolveWritableStoreId,
} from "@/lib/session-access";
import type { RewardChoice } from "@/lib/types";

export const runtime = "nodejs";

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

    const code = new URL(request.url).searchParams.get("code") ?? "";
    if (!code.trim()) {
      return NextResponse.json(
        { error: "Claim code is required." },
        { status: 400 },
      );
    }

    const found = await getRewardByClaimCode(storeId, code);
    if (!found) {
      return NextResponse.json(
        { error: "Claim code not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      claimCode: found.claimCode,
      status: found.status,
      expiresAt: found.expiresAt,
      rewardChoice: found.rewardChoice,
      referrer: {
        name: found.referrer.name,
        phoneDisplay: found.referrer.phoneDisplay,
        email: found.referrer.email,
      },
    });
  } catch (error) {
    console.error("GET /api/referrals/claim failed:", error);
    return NextResponse.json(
      { error: "Failed to look up claim code." },
      { status: 500 },
    );
  }
}

type ClaimBody = {
  claimCode?: string;
  rewardChoice?: RewardChoice;
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

    const body = (await request.json()) as ClaimBody;
    if (
      body.rewardChoice !== "gram" &&
      body.rewardChoice !== "thc_drink"
    ) {
      return NextResponse.json(
        { error: "Select gram or THC drink." },
        { status: 400 },
      );
    }

    const role = getSessionRole(session);
    const claimedBy =
      role === "platform"
        ? "platform"
        : getSessionStoreId(session) || session.user?.email || "store";

    const result = await claimReferrerReward({
      storeId,
      claimCode: body.claimCode ?? "",
      rewardChoice: body.rewardChoice,
      claimedBy,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      claimCode: result.reward.claimCode,
      rewardChoice: result.reward.rewardChoice,
      referrerName: result.referrer.name,
    });
  } catch (error) {
    console.error("POST /api/referrals/claim failed:", error);
    return NextResponse.json(
      { error: "Failed to claim reward." },
      { status: 500 },
    );
  }
}
