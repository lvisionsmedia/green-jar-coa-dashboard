"use client";

import { signOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { formatDate, formatFileSize } from "@/lib/format";
import type { CoaRecord } from "@/lib/types";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const PUBLIC_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://thegreenjar.xyz";

type ListResponse = {
  items: CoaRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function AdminDashboard() {
  const [coas, setCoas] = useState<CoaRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [uploadMessage, setUploadMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  const loadCoas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        sort,
        page: String(page),
        pageSize: String(pageSize),
      });
      const response = await fetch(`/api/coas?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load COA files.");
      }

      const data = (await response.json()) as ListResponse;
      setCoas(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load COA files.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, sort]);

  useEffect(() => {
    loadCoas();
  }, [loadCoas]);

  async function handleFiles(fileList: FileList | null) {
    setError("");
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

      if (!isPdf) {
        errors.push(`${file.name} is not a PDF.`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} is larger than 25MB.`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      setError(errors.join(" "));
    }

    if (validFiles.length === 0) return;

    const formData = new FormData();
    validFiles.forEach((file) => formData.append("files", file));

    const response = await fetch("/api/coas", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Upload failed.");
      return;
    }

    setUploadMessage(
      `${validFiles.length} ${validFiles.length === 1 ? "file" : "files"} uploaded successfully`,
    );
    setPage(1);
    await loadCoas();
  }

  async function deleteFile(id: string) {
    const response = await fetch(`/api/coas/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Delete failed.");
      return;
    }

    await loadCoas();
  }

  function previewFile(id: string) {
    window.open(`/api/coas/${id}/file`, "_blank", "noopener,noreferrer");
  }

  const startIndex = total === 0 ? 0 : (page - 1) * pageSize;
  const first = total === 0 ? 0 : startIndex + 1;
  const last = startIndex + coas.length;

  return (
    <>
      <header className="page-header">
        <div>
          <h1 id="dashboard-title">
            The Green Jar COA&apos;s <span aria-hidden="true">🌿</span>
          </h1>
          <p>Upload, manage and organize Certificates of Analysis</p>
        </div>
        <button
          className="admin-profile-button"
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          aria-label="Sign out"
        >
          <span className="profile-avatar" aria-hidden="true">
            <svg viewBox="0 0 36 36">
              <path
                d="M11 7h14l2 4v17a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4V11l2-4Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
              />
              <path
                d="M18 25c4-3 6-6 6-10-3 0-5 1-6 3-1-2-3-3-6-3 0 4 2 7 6 10Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span>
            <strong>Green Jar Admin</strong>
            <small>Sign out</small>
          </span>
          <span className="chevron" aria-hidden="true">
            ⌄
          </span>
        </button>
      </header>

      <section className="card upload-card" aria-labelledby="upload-title">
        <h2 id="upload-title" className="sr-only">
          Upload COA&apos;s PDFs
        </h2>
        <div
          className={`drop-zone${dragOver ? " drag-over" : ""}`}
          tabIndex={0}
          role="button"
          aria-label="Upload PDF files"
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            void handleFiles(event.dataTransfer.files);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              document.getElementById("file-input")?.click();
            }
          }}
        >
          <input
            id="file-input"
            type="file"
            accept="application/pdf,.pdf"
            multiple
            onChange={(event) => {
              void handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <div className="drop-primary">
            <span className="upload-icon" aria-hidden="true">
              <svg viewBox="0 0 48 48">
                <path
                  d="M16 34H12a9 9 0 0 1 0-18 13 13 0 0 1 25-3 10 10 0 0 1-1 21h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M24 35V20m0 0-7 7m7-7 7 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <p>Drag &amp; Drop PDF files here</p>
              <span>or click to browse</span>
              <small>Only PDF files are allowed</small>
            </div>
          </div>
          <div className="helper-box">
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path
                d="M8 3h11l5 5v21H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M19 3v6h6M10 19h12M10 23h12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <div>
              <strong>PDF files only</strong>
              <span>Max file size: 25MB</span>
              <span>Multiple files allowed</span>
            </div>
          </div>
        </div>

        {uploadMessage ? (
          <div className="feedback success" role="status">
            <span aria-hidden="true">✓</span>
            <p>{uploadMessage}</p>
            <button type="button" onClick={() => setUploadMessage("")}>
              Clear All
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="feedback error" role="alert">
            <p>{error}</p>
          </div>
        ) : null}
      </section>

      <section className="card table-card" aria-labelledby="table-title">
        <div className="section-toolbar">
          <h2 id="table-title">Uploaded COA&apos;s</h2>
          <div className="table-controls">
            <label className="search-field">
              <span className="sr-only">Search COA&apos;s files</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="m21 21-4.4-4.4M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="search"
                placeholder="Search COA's files..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className="select-field">
              <span className="sr-only">Sort COA&apos;s files</span>
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as "newest" | "oldest");
                  setPage(1);
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </label>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">File Name</th>
                <th scope="col">Upload Date</th>
                <th scope="col">Size</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="muted-cell">
                    Loading COA files...
                  </td>
                </tr>
              ) : (
                coas.map((coa) => (
                  <tr key={coa.id}>
                    <td>
                      <div className="file-cell">
                        <span className="pdf-icon" aria-hidden="true">
                          PDF
                        </span>
                        <span>{coa.fileName}</span>
                      </div>
                    </td>
                    <td className="muted-cell">
                      {formatDate(coa.uploadedAt)}
                    </td>
                    <td className="muted-cell">
                      {formatFileSize(coa.fileSize)}
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="preview-button"
                          type="button"
                          onClick={() => previewFile(coa.id)}
                        >
                          <span aria-hidden="true">⊙</span> Preview
                        </button>
                        <button
                          className="delete-button"
                          type="button"
                          aria-label={`Delete ${coa.fileName}`}
                          onClick={() => void deleteFile(coa.id)}
                        >
                          <span aria-hidden="true">⌫</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && coas.length === 0 ? (
          <div className="empty-state">
            <strong>No COA&apos;s found</strong>
            <span>Upload PDFs or adjust your search to see results.</span>
          </div>
        ) : null}

        <div className="table-footer">
          <p>
            {total === 0
              ? "Showing 0 to 0 of 0 results"
              : `Showing ${first} to ${last} of ${total} results`}
          </p>
          <div className="pagination" aria-label="Pagination">
            <button
              className="page-button"
              type="button"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              aria-label="Previous page"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, index) => {
              const pageNumber = index + 1;
              return (
                <button
                  key={pageNumber}
                  className={`page-button${pageNumber === page ? " active" : ""}`}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  aria-label={`Page ${pageNumber}`}
                >
                  {pageNumber}
                </button>
              );
            })}
            <button
              className="page-button"
              type="button"
              disabled={page === totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              aria-label="Next page"
            >
              ›
            </button>
          </div>
          <label className="select-field per-page">
            <span className="sr-only">Rows per page</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
            </select>
          </label>
        </div>
      </section>

      <section className="public-notice" aria-labelledby="public-title">
        <span className="notice-icon" aria-hidden="true">
          ✓
        </span>
        <div>
          <h2 id="public-title">Public COA&apos;s Page</h2>
          <p>Uploaded COA&apos;s are publicly available on your website at:</p>
          <a href={PUBLIC_URL}>{PUBLIC_URL}</a>
        </div>
        <button
          id="view-public-button"
          type="button"
          onClick={() => window.open(PUBLIC_URL, "_blank", "noopener,noreferrer")}
        >
          View Public Page ↗
        </button>
      </section>
    </>
  );
}
