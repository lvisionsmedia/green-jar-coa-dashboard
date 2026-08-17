import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createStoreWithAdmin } from "@/lib/store-admin";
import { listStores } from "@/lib/stores";
import { getSessionRole } from "@/lib/session-access";
import { storePublicUrl } from "@/lib/tenant";

function requirePlatform() {
  return auth().then((session) => {
    if (!session || getSessionRole(session) !== "platform") {
      return null;
    }
    return session;
  });
}

export async function GET() {
  const session = await requirePlatform();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stores = await listStores();
    return NextResponse.json({
      stores: stores.map((store) => ({
        ...store,
        publicUrl: storePublicUrl(store.slug),
      })),
    });
  } catch (error) {
    console.error("GET /api/platform/stores failed:", error);
    return NextResponse.json(
      { error: "Failed to list stores." },
      { status: 500 },
    );
  }
}

type CreatePayload = {
  name?: string;
  slug?: string;
  adminEmail?: string;
  adminPassword?: string;
};

export async function POST(request: Request) {
  const session = await requirePlatform();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as CreatePayload;
    const store = await createStoreWithAdmin({
      name: payload.name ?? "",
      slug: payload.slug ?? "",
      adminEmail: payload.adminEmail ?? "",
      adminPassword: payload.adminPassword ?? "",
    });

    return NextResponse.json({
      store: {
        ...store,
        publicUrl: storePublicUrl(store.slug),
      },
    });
  } catch (error) {
    console.error("POST /api/platform/stores failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create store.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
