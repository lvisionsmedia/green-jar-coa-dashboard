import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import {
  HOST_KIND_HEADER,
  STORE_ID_HEADER,
  STORE_NAME_HEADER,
  STORE_SLUG_HEADER,
  parseStorePath,
  storePublicPath,
} from "@/lib/tenant";

const { auth } = NextAuth(authConfig);

type StoreLookup = {
  id: string;
  slug: string;
  name: string;
};

async function lookupStoreBySlug(slug: string): Promise<StoreLookup | null> {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.greencoa_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.greencoa_SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Supabase is not configured.");
  }

  const endpoint = new URL(`${url}/rest/v1/stores`);
  endpoint.searchParams.set("select", "id,slug,name");
  endpoint.searchParams.set("slug", `eq.${slug.toLowerCase()}`);
  endpoint.searchParams.set("limit", "1");

  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Store lookup failed (${response.status})`);
  }

  const rows = (await response.json()) as StoreLookup[];
  return rows[0] ?? null;
}

function sessionRole(authValue: {
  user?: { role?: string; storeId?: string | null };
} | null) {
  return authValue?.user?.role ?? null;
}

function sessionStoreId(authValue: {
  user?: { storeId?: string | null };
} | null) {
  return authValue?.user?.storeId ?? null;
}

export default auth(async (request) => {
  const { pathname } = request.nextUrl;
  const storePath = parseStorePath(pathname);
  const requestHeaders = new Headers(request.headers);

  if (storePath) {
    let store: StoreLookup | null;
    try {
      store = await lookupStoreBySlug(storePath.slug);
    } catch (error) {
      console.error("Store lookup failed:", error);
      return new NextResponse("Store lookup failed", { status: 500 });
    }

    if (!store) {
      return new NextResponse("Store not found", { status: 404 });
    }

    requestHeaders.set(HOST_KIND_HEADER, "store");
    requestHeaders.set(STORE_ID_HEADER, store.id);
    requestHeaders.set(STORE_SLUG_HEADER, store.slug);
    requestHeaders.set(STORE_NAME_HEADER, store.name);

    const isAdminPath =
      storePath.rest === "/admin" || storePath.rest.startsWith("/admin/");

    if (isAdminPath) {
      const role = sessionRole(request.auth);
      const userStoreId = sessionStoreId(request.auth);
      const loginUrl = new URL(
        `${storePublicPath(store.slug)}/login`,
        request.nextUrl.origin,
      );

      if (!request.auth) {
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }

      if (role === "store" && userStoreId && userStoreId !== store.id) {
        return NextResponse.redirect(loginUrl);
      }

      if (role !== "platform" && role !== "store") {
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  requestHeaders.set(HOST_KIND_HEADER, "apex");

  // Legacy apex /admin → platform
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return NextResponse.redirect(new URL("/platform", request.nextUrl.origin));
  }

  if (pathname.startsWith("/platform")) {
    if (!request.auth || sessionRole(request.auth) !== "platform") {
      const loginUrl = new URL("/login", request.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
