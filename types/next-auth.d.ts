import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: "platform" | "store";
    storeId?: string | null;
    storeSlug?: string | null;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      role?: "platform" | "store";
      storeId?: string | null;
      storeSlug?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "platform" | "store";
    storeId?: string | null;
    storeSlug?: string | null;
  }
}

export {};
