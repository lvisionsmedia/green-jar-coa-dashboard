"use client";

import { useEffect, useState } from "react";
import { formatDate, formatFileSize } from "@/lib/format";
import type { CoaRecord } from "@/lib/types";

export function PublicCoaList() {
  const [coas, setCoas] = useState<CoaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCoas() {
      try {
        const response = await fetch("/api/coas?pageSize=100");
        if (!response.ok) {
          throw new Error("Failed to load COA files.");
        }

        const data = await response.json();
        setCoas(data.items ?? []);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load COA files.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadCoas();
  }, []);

  if (loading) {
    return (
      <div className="public-empty">Loading Certificates of Analysis...</div>
    );
  }

  if (error) {
    return <div className="public-empty">{error}</div>;
  }

  if (coas.length === 0) {
    return (
      <div className="public-empty">
        No public COA&apos;s have been uploaded yet.
      </div>
    );
  }

  return (
    <div className="public-list">
      {coas.map((coa) => (
        <a
          key={coa.id}
          href={`/api/coas/${coa.id}/file`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="public-file">
            <span className="pdf-icon" aria-hidden="true">
              PDF
            </span>
            <span>{coa.fileName}</span>
          </span>
          <span className="public-meta">
            {formatDate(coa.uploadedAt)} · {formatFileSize(coa.fileSize)} ↗
          </span>
        </a>
      ))}
    </div>
  );
}
