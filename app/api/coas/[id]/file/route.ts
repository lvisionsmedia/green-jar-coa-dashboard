import { NextResponse } from "next/server";
import { getCoa } from "@/lib/coas";
import { resolveRequestTenant } from "@/lib/request-tenant";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await resolveRequestTenant(request);
    if (!tenant.store) {
      return NextResponse.json(
        { error: "COA files are only available for a store. Pass storeSlug." },
        { status: 400 },
      );
    }

    const { id } = await context.params;
    const coa = await getCoa(id, tenant.store.id);

    if (!coa) {
      return NextResponse.json({ error: "COA not found." }, { status: 404 });
    }

    return NextResponse.redirect(coa.blobUrl);
  } catch (error) {
    console.error("GET /api/coas/[id]/file failed:", error);
    return NextResponse.json(
      { error: "Failed to open COA file." },
      { status: 500 },
    );
  }
}
