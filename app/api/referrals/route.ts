import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  findPendingRewardsByReferrerPhone,
  getReferralStats,
  listPendingRewards,
  listRecentRedemptions,
} from "@/lib/referrals";
import { resolveRequestTenant } from "@/lib/request-tenant";
import { resolveWritableStoreId } from "@/lib/session-access";

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

    const { searchParams } = new URL(request.url);
    const pendingPhone = searchParams.get("pendingPhone");

    if (pendingPhone) {
      const result = await findPendingRewardsByReferrerPhone(
        storeId,
        pendingPhone,
      );
      return NextResponse.json(result);
    }

    const [stats, redemptions, pending] = await Promise.all([
      getReferralStats(storeId),
      listRecentRedemptions(storeId),
      listPendingRewards(storeId),
    ]);

    return NextResponse.json({ stats, redemptions, pending });
  } catch (error) {
    console.error("GET /api/referrals failed:", error);
    return NextResponse.json(
      { error: "Failed to load referrals." },
      { status: 500 },
    );
  }
}
