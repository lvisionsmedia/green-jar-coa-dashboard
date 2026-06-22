"use client";

import { SessionProvider } from "next-auth/react";
import { RefreshPrompt } from "@/components/RefreshPrompt";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <RefreshPrompt />
    </SessionProvider>
  );
}
