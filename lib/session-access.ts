import type { Session } from "next-auth";
import type { SessionRole } from "@/lib/types";

type AppSession = Session & {
  user?: Session["user"] & {
    role?: SessionRole;
    storeId?: string | null;
    storeSlug?: string | null;
  };
};

export function getSessionRole(session: Session | null): SessionRole | null {
  const role = (session as AppSession | null)?.user?.role;
  return role === "platform" || role === "store" ? role : null;
}

export function getSessionStoreId(session: Session | null): string | null {
  return (session as AppSession | null)?.user?.storeId ?? null;
}

/** Resolve which store an authenticated write may target. */
export function resolveWritableStoreId(
  session: Session | null,
  hostStoreId: string | null,
): string | null {
  const role = getSessionRole(session);
  if (!role) return null;

  if (role === "platform") {
    return hostStoreId;
  }

  const sessionStoreId = getSessionStoreId(session);
  if (!sessionStoreId) return null;
  if (hostStoreId && sessionStoreId !== hostStoreId) return null;
  return sessionStoreId;
}
