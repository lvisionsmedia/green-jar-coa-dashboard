import { headers } from "next/headers";
import { getStoreBySlug } from "@/lib/stores";
import {
  HOST_KIND_HEADER,
  STORE_ID_HEADER,
  STORE_NAME_HEADER,
  STORE_SLUG_HEADER,
  parseHost,
} from "@/lib/tenant";
import type { StoreRecord } from "@/lib/types";

export type RequestTenant = {
  hostKind: "apex" | "store" | "reserved" | "unknown";
  store: StoreRecord | null;
};

export function getTenantFromRequestHeaders(
  headerStore: Headers,
): { storeId: string | null; storeSlug: string | null; storeName: string | null; hostKind: string } {
  return {
    storeId: headerStore.get(STORE_ID_HEADER),
    storeSlug: headerStore.get(STORE_SLUG_HEADER),
    storeName: headerStore.get(STORE_NAME_HEADER),
    hostKind: headerStore.get(HOST_KIND_HEADER) ?? "unknown",
  };
}

export async function resolveRequestTenant(
  request?: Request,
): Promise<RequestTenant> {
  if (request) {
    const fromHeaders = getTenantFromRequestHeaders(request.headers);
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

    const hostContext = parseHost(request.headers.get("host"));
    if (hostContext.kind === "store") {
      const store = await getStoreBySlug(hostContext.slug);
      return { hostKind: "store", store };
    }

    return {
      hostKind: hostContext.kind === "apex" ? "apex" : hostContext.kind,
      store: null,
    };
  }

  const headerList = await headers();
  const fromHeaders = getTenantFromRequestHeaders(headerList);
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

  const hostContext = parseHost(headerList.get("host"));
  if (hostContext.kind === "store") {
    const store = await getStoreBySlug(hostContext.slug);
    return { hostKind: "store", store };
  }

  return {
    hostKind: hostContext.kind === "apex" ? "apex" : hostContext.kind,
    store: null,
  };
}
