"use client";

import { useCallback, useEffect, useState } from "react";

const POLL_INTERVAL_MS = 60_000;

export function RefreshPrompt() {
  const [show, setShow] = useState(false);

  const checkForUpdate = useCallback(async (currentBuildId: { value: string | null }) => {
    try {
      const response = await fetch("/api/version", { cache: "no-store" });
      if (!response.ok) return;

      const { buildId } = (await response.json()) as { buildId: string };

      if (currentBuildId.value === null) {
        currentBuildId.value = buildId;
        return;
      }

      if (buildId !== currentBuildId.value) {
        setShow(true);
      }
    } catch {
      // Ignore transient network errors while polling.
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;

    const currentBuildId = { value: null as string | null };

    void checkForUpdate(currentBuildId);

    const intervalId = window.setInterval(() => {
      void checkForUpdate(currentBuildId);
    }, POLL_INTERVAL_MS);

    function handleFocus() {
      void checkForUpdate(currentBuildId);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void checkForUpdate(currentBuildId);
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkForUpdate]);

  if (!show) return null;

  return (
    <aside className="refresh-prompt" role="status" aria-live="polite">
      <div className="refresh-prompt-body">
        <strong>A new version is available</strong>
        <p>Refresh to load the latest fixes and improvements.</p>
      </div>
      <div className="refresh-prompt-actions">
        <button type="button" onClick={() => window.location.reload()}>
          Refresh
        </button>
        <button type="button" className="ghost" onClick={() => setShow(false)}>
          Not now
        </button>
      </div>
    </aside>
  );
}
