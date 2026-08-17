export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "admin",
  "platform",
  "api",
  "mail",
  "app",
]);

export const ROOT_DOMAINS = [
  "thegreenjar.xyz",
  "localhost",
  "127.0.0.1",
];

export type HostContext =
  | { kind: "apex" }
  | { kind: "reserved"; subdomain: string }
  | { kind: "store"; slug: string }
  | { kind: "unknown" };

function stripPort(host: string) {
  return host.split(":")[0]?.toLowerCase() ?? "";
}

export function parseHost(hostHeader: string | null): HostContext {
  if (!hostHeader) return { kind: "unknown" };

  const host = stripPort(hostHeader);

  if (!host) return { kind: "unknown" };

  // Local subdomain: green-jar.localhost
  if (host.endsWith(".localhost")) {
    const slug = host.slice(0, -".localhost".length);
    if (!slug || RESERVED_SUBDOMAINS.has(slug)) {
      return { kind: "reserved", subdomain: slug || "localhost" };
    }
    return { kind: "store", slug };
  }

  if (host === "localhost" || host === "127.0.0.1") {
    return { kind: "apex" };
  }

  // Vercel preview / deployment hosts act as apex/platform
  if (host.endsWith(".vercel.app")) {
    return { kind: "apex" };
  }

  for (const root of ROOT_DOMAINS) {
    if (host === root) {
      return { kind: "apex" };
    }

    if (host === `www.${root}`) {
      return { kind: "apex" };
    }

    const suffix = `.${root}`;
    if (host.endsWith(suffix)) {
      const slug = host.slice(0, -suffix.length);
      if (!slug.includes(".") && slug.length > 0) {
        if (RESERVED_SUBDOMAINS.has(slug)) {
          return { kind: "reserved", subdomain: slug };
        }
        return { kind: "store", slug };
      }
    }
  }

  return { kind: "unknown" };
}

export function isValidStoreSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && !RESERVED_SUBDOMAINS.has(slug);
}

export function storePublicOrigin(slug: string, requestHost?: string | null) {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://thegreenjar.xyz";

  try {
    const siteUrl = new URL(site);
    const rootHost = siteUrl.hostname.replace(/^www\./, "");

    if (requestHost) {
      const host = stripPort(requestHost);
      if (host.endsWith(".localhost") || host === "localhost") {
        return `http://${slug}.localhost:${siteUrl.port || "3000"}`;
      }
    }

    if (rootHost === "localhost" || rootHost === "127.0.0.1") {
      return `http://${slug}.localhost:${siteUrl.port || "3000"}`;
    }

    return `${siteUrl.protocol}//${slug}.${rootHost}`;
  } catch {
    return `https://${slug}.thegreenjar.xyz`;
  }
}

export const STORE_ID_HEADER = "x-store-id";
export const STORE_SLUG_HEADER = "x-store-slug";
export const STORE_NAME_HEADER = "x-store-name";
export const HOST_KIND_HEADER = "x-host-kind";
