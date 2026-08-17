"use client";

import { signOut, useSession } from "next-auth/react";
import { FormEvent, useCallback, useEffect, useState } from "react";

type StoreItem = {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
  publicUrl: string;
};

export function PlatformDashboard() {
  const { data: session } = useSession();
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const loadStores = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/platform/stores");
      if (!response.ok) {
        throw new Error("Failed to load stores.");
      }
      const data = (await response.json()) as { stores: StoreItem[] };
      setStores(data.stores ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load stores.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  function slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/platform/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          adminEmail,
          adminPassword,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        store?: StoreItem;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create store.");
      }

      setMessage(
        data.store
          ? `Created ${data.store.name}. Open ${data.store.publicUrl}`
          : "Store created.",
      );
      setName("");
      setSlug("");
      setAdminEmail("");
      setAdminPassword("");
      await loadStores();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create store.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="platform-page">
      <header className="platform-header">
        <div>
          <p className="platform-eyebrow">Platform</p>
          <h1>Stores</h1>
          <p>Create a store subdomain and its admin login.</p>
        </div>
        <button
          className="login-button"
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Sign out {session?.user?.email ? `(${session.user.email})` : ""}
        </button>
      </header>

      {error ? <div className="login-error">{error}</div> : null}
      {message ? <div className="platform-success">{message}</div> : null}

      <section className="platform-card" aria-labelledby="add-store-title">
        <h2 id="add-store-title">Add store</h2>
        <form className="platform-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="store-name">Store name</label>
            <input
              id="store-name"
              value={name}
              onChange={(event) => {
                const next = event.target.value;
                setName(next);
                setSlug(slugify(next));
              }}
              required
            />
          </div>
          <div className="login-field">
            <label htmlFor="store-slug">Subdomain slug</label>
            <input
              id="store-slug"
              value={slug}
              onChange={(event) => setSlug(slugify(event.target.value))}
              placeholder="green-jar"
              required
            />
            <small className="platform-hint">
              Becomes {slug || "slug"}.thegreenjar.xyz
            </small>
          </div>
          <div className="login-field">
            <label htmlFor="admin-email">Store admin email</label>
            <input
              id="admin-email"
              type="email"
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
              required
            />
          </div>
          <div className="login-field">
            <label htmlFor="admin-password">Store admin password</label>
            <input
              id="admin-password"
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              minLength={8}
              required
            />
          </div>
          <button className="login-button" type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create store"}
          </button>
        </form>
      </section>

      <section className="platform-card" aria-labelledby="stores-title">
        <h2 id="stores-title">Existing stores</h2>
        {loading ? (
          <p>Loading stores...</p>
        ) : stores.length === 0 ? (
          <p>No stores yet.</p>
        ) : (
          <div className="platform-table-wrap">
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Public URL</th>
                  <th>Admin</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => (
                  <tr key={store.id}>
                    <td>{store.name}</td>
                    <td>{store.slug}</td>
                    <td>
                      <a href={store.publicUrl} target="_blank" rel="noreferrer">
                        {store.publicUrl}
                      </a>
                    </td>
                    <td>
                      <a
                        href={`${store.publicUrl}/admin`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open admin
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
