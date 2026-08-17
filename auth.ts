import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { verifyPassword } from "@/lib/passwords";
import { getStoreBySlug, getStoreUserByEmail } from "@/lib/stores";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        storeSlug: { label: "Store slug", type: "text" },
      },
      authorize: async (credentials) => {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : "";
        const storeSlug =
          typeof credentials?.storeSlug === "string"
            ? credentials.storeSlug.trim().toLowerCase()
            : "";

        if (!email || !password) {
          return null;
        }

        const platformEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        const platformPassword = process.env.ADMIN_PASSWORD;

        if (
          platformEmail &&
          platformPassword &&
          email === platformEmail &&
          password === platformPassword
        ) {
          return {
            id: "platform",
            email,
            role: "platform" as const,
            storeId: null,
            storeSlug: null,
          };
        }

        // Apex login is platform-only.
        if (!storeSlug) {
          return null;
        }

        const store = await getStoreBySlug(storeSlug);
        if (!store) {
          return null;
        }

        const storeUser = await getStoreUserByEmail(store.id, email);
        if (!storeUser) {
          return null;
        }

        const valid = await verifyPassword(password, storeUser.passwordHash);
        if (!valid) {
          return null;
        }

        return {
          id: storeUser.id,
          email: storeUser.email,
          role: "store" as const,
          storeId: store.id,
          storeSlug: store.slug,
        };
      },
    }),
  ],
});
