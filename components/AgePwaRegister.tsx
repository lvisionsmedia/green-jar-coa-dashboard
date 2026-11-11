"use client";

import { useEffect } from "react";

function isAgeHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "age.localhost" || host.startsWith("age.");
}

export function AgePwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = () => {
      const onAgeHost = isAgeHost(window.location.hostname);
      const scriptUrl = onAgeHost ? "/sw-age.js" : "/age/sw.js";
      const scope = onAgeHost ? "/" : "/age/";

      void navigator.serviceWorker.register(scriptUrl, { scope }).catch((error) => {
        console.error("Age checker SW registration failed:", error);
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
