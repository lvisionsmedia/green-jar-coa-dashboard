/** Slugs that cannot be used as store path segments. */
export const RESERVED_SLUGS = new Set([
  "www",
  "admin",
  "platform",
  "api",
  "mail",
  "app",
  "login",
  "store",
]);

export type StorePathContext = {
  slug: string;
  /** Path after `/store/{slug}`, e.g. `/admin`, `/login`, or `""` for the public page. */
  rest: string;
};

export function isValidStoreSlug(slug: string): boolean {
  return (
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && !RESERVED_SLUGS.has(slug)
  );
}

/** Extract store slug from `/store/{slug}/...`. */
export function parseStorePath(pathname: string): StorePathContext | null {
  const match = pathname.match(/^\/store\/([^/]+)(\/.*)?$/);
  if (!match) return null;

  const slug = match[1]?.toLowerCase() ?? "";
  if (!slug || !isValidStoreSlug(slug)) return null;

  const rest = match[2] ?? "";
  return { slug, rest };
}

/** Relative public path for a store, e.g. `/store/green-jar`. */
export function storePublicPath(slug: string): string {
  return `/store/${slug.toLowerCase()}`;
}

/** Absolute public URL for a store. */
export function storePublicUrl(slug: string): string {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://thegreenjar.xyz";
  return `${site}${storePublicPath(slug)}`;
}

export const STORE_ID_HEADER = "x-store-id";
export const STORE_SLUG_HEADER = "x-store-slug";
export const STORE_NAME_HEADER = "x-store-name";
export const HOST_KIND_HEADER = "x-host-kind";
