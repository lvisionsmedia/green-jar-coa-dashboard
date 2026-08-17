import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteCoa } from "@/lib/coas";
import { resolveRequestTenant } from "@/lib/request-tenant";
import { resolveWritableStoreId } from "@/lib/session-access";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenant = await resolveRequestTenant(request);
    const storeId = resolveWritableStoreId(session, tenant.store?.id ?? null);

    if (!storeId) {
      return NextResponse.json(
        { error: "Deletes are only available for a store. Pass storeSlug." },
        { status: 400 },
      );
    }

    const { id } = await context.params;
    const deleted = await deleteCoa(id, storeId);

    if (!deleted) {
      return NextResponse.json({ error: "COA not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/coas/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to delete COA file." },
      { status: 500 },
    );
  }
}
