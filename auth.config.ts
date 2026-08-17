import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized() {
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.storeId = user.storeId ?? null;
        token.storeSlug = user.storeSlug ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const role = token.role;
        session.user.role =
          role === "platform" || role === "store" ? role : undefined;
        session.user.storeId =
          typeof token.storeId === "string" ? token.storeId : null;
        session.user.storeSlug =
          typeof token.storeSlug === "string" ? token.storeSlug : null;
        if (typeof token.sub === "string") {
          session.user.id = token.sub;
        }
      }
      return session;
    },
  },
  providers: [],
  trustHost: true,
} satisfies NextAuthConfig;
