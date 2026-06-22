import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createCoa, listCoas } from "@/lib/coas";
import { finalizeCoaUpload } from "@/lib/finalize-coa-upload";

export const runtime = "nodejs";
export const maxDuration = 60;

type FinalizePayload = {
  blobUrl?: string;
  fileName?: string;
  fileSize?: number;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const sort = searchParams.get("sort") === "oldest" ? "oldest" : "newest";
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "10");

    const result = await listCoas({ search, sort, page, pageSize });
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/coas failed:", error);
    return NextResponse.json(
      { error: "Failed to load COA files." },
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
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload = (await request.json()) as FinalizePayload;
      const blobUrl = payload.blobUrl?.trim();
      const fileName = payload.fileName?.trim();

      if (!blobUrl || !fileName) {
        return NextResponse.json(
          { error: "Missing upload details." },
          { status: 400 },
        );
      }

      const record = await finalizeCoaUpload(
        blobUrl,
        fileName,
        payload.fileSize,
      );
      await createCoa(record);

      return NextResponse.json({ uploaded: [record] });
    }

    return NextResponse.json(
      {
        error:
          "Direct uploads are no longer supported. Please refresh the page and try again.",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("POST /api/coas failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to upload COA files.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
