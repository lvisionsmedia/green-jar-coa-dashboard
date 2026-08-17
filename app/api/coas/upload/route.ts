import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { MAX_UPLOAD_SIZE } from "@/lib/compress-pdf";
import { resolveRequestTenant } from "@/lib/request-tenant";
import { resolveWritableStoreId } from "@/lib/session-access";

export const runtime = "nodejs";

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
        { error: "Upload is only available on a store subdomain." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const expectedPrefix = `coas/${storeId}/tmp/`;
        if (!pathname.startsWith(expectedPrefix)) {
          throw new Error("Invalid upload path for this store.");
        }

        return {
          allowedContentTypes: ["application/pdf", "application/x-pdf"],
          maximumSizeInBytes: MAX_UPLOAD_SIZE,
        };
      },
      onUploadCompleted: async () => {
        // Finalized separately so we can compress before storing metadata.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("POST /api/coas/upload failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to start upload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
