"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { storePublicPath } from "@/lib/tenant";

type LoginFormProps = {
  mode: "platform" | "store";
  storeSlug?: string;
  storeName?: string;
};

export function LoginForm({ mode, storeSlug, storeName }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultCallback =
    mode === "platform"
      ? "/platform"
      : storeSlug
        ? `${storePublicPath(storeSlug)}/admin`
        : "/platform";
  const callbackUrl = searchParams.get("callbackUrl") ?? defaultCallback;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      storeSlug: mode === "store" ? (storeSlug ?? "") : "",
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form className="login-card" onSubmit={handleSubmit}>
      <h1>{mode === "platform" ? "Platform Login" : "Admin Login"}</h1>
      <p>
        {mode === "platform"
          ? "Sign in as platform admin to create and manage stores."
          : storeName
            ? `Sign in to manage COA files for ${storeName}.`
            : storeSlug
              ? `Sign in to manage COA files for ${storeSlug}.`
              : "Sign in to upload and manage COA files."}
      </p>

      {error ? <div className="login-error">{error}</div> : null}

      <div className="login-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="login-field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      <button className="login-button" type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
