import { headers } from "next/headers";
import { getStoreBySlug } from "@/lib/stores";
import {
  HOST_KIND_HEADER,
  STORE_ID_HEADER,
  STORE_NAME_HEADER,
  STORE_SLUG_HEADER,
  parseStorePath,
} from "@/lib/tenant";
import type { StoreRecord } from "@/lib/types";

export type RequestTenant = {
  hostKind: "apex" | "store" | "unknown";
  store: StoreRecord | null;
};

export function getTenantFromRequestHeaders(headerStore: Headers): {
  storeId: string | null;
  storeSlug: string | null;
  storeName: string | null;
  hostKind: string;
} {
  return {
    storeId: headerStore.get(STORE_ID_HEADER),
    storeSlug: headerStore.get(STORE_SLUG_HEADER),
    storeName: headerStore.get(STORE_NAME_HEADER),
    hostKind: headerStore.get(HOST_KIND_HEADER) ?? "unknown",
  };
}

function tenantFromHeaderValues(fromHeaders: {
  storeId: string | null;
  storeSlug: string | null;
  storeName: string | null;
  hostKind: string;
}): RequestTenant | null {
  if (fromHeaders.storeId && fromHeaders.storeSlug && fromHeaders.storeName) {
    return {
      hostKind: "store",
      store: {
        id: fromHeaders.storeId,
        slug: fromHeaders.storeSlug,
        name: fromHeaders.storeName,
        createdAt: "",
      },
    };
  }
  return null;
}

export async function resolveRequestTenant(
  request?: Request,
): Promise<RequestTenant> {
  if (request) {
    const fromHeaders = tenantFromHeaderValues(
      getTenantFromRequestHeaders(request.headers),
    );
    if (fromHeaders) return fromHeaders;

    const url = new URL(request.url);
    const storeSlugParam = url.searchParams.get("storeSlug")?.trim().toLowerCase();
    if (storeSlugParam) {
      const store = await getStoreBySlug(storeSlugParam);
      return { hostKind: store ? "store" : "unknown", store };
    }

    const pathContext = parseStorePath(url.pathname);
    if (pathContext) {
      const store = await getStoreBySlug(pathContext.slug);
      return { hostKind: store ? "store" : "unknown", store };
    }

    return { hostKind: "apex", store: null };
  }

  const headerList = await headers();
  const fromHeaders = tenantFromHeaderValues(
    getTenantFromRequestHeaders(headerList),
  );
  if (fromHeaders) return fromHeaders;

  return { hostKind: "apex", store: null };
}
