import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteCoa } from "@/lib/coas";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const deleted = await deleteCoa(id);

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
