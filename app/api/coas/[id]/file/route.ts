import { NextResponse } from "next/server";
import { getCoa } from "@/lib/coas";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const coa = await getCoa(id);

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
