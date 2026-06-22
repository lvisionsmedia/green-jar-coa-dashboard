import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createCoa, listCoas } from "@/lib/coas";
import { compressPdf, MAX_UPLOAD_SIZE } from "@/lib/compress-pdf";

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
    const formData = await request.formData();
    const files = formData.getAll("files");

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided." }, { status: 400 });
    }

    const uploaded = [];

    for (const entry of files) {
      if (!(entry instanceof File)) continue;

      const isPdf =
        entry.type === "application/pdf" ||
        entry.name.toLowerCase().endsWith(".pdf");

      if (!isPdf) {
        return NextResponse.json(
          { error: `${entry.name} is not a PDF.` },
          { status: 400 },
        );
      }

      if (entry.size > MAX_UPLOAD_SIZE) {
        return NextResponse.json(
          { error: `${entry.name} is larger than 25MB.` },
          { status: 400 },
        );
      }

      const input = new Uint8Array(await entry.arrayBuffer());
      let compressed: Uint8Array;

      try {
        compressed = compressPdf(input);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not compress PDF.";
        return NextResponse.json(
          { error: `${entry.name}: ${message}` },
          { status: 400 },
        );
      }

      const id = crypto.randomUUID();
      const blob = await put(`coas/${id}.pdf`, Buffer.from(compressed), {
        access: "public",
        contentType: "application/pdf",
      });

      const record = {
        id,
        fileName: entry.name,
        blobUrl: blob.url,
        fileSize: compressed.length,
        uploadedAt: new Date().toISOString(),
      };

      await createCoa(record);
      uploaded.push(record);
    }

    return NextResponse.json({ uploaded });
  } catch (error) {
    console.error("POST /api/coas failed:", error);
    return NextResponse.json(
      { error: "Failed to upload COA files." },
      { status: 500 },
    );
  }
}
