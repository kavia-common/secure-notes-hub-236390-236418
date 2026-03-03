"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/Alert";
import { TopBar } from "@/components/TopBar";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.length >= 6 && !loading;
  }, [email, password, loading]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await api.login(email.trim(), password);
      setToken(tokens.access_token);
      router.push("/app");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Login failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="appShell">
      <TopBar />
      <main className="container">
        <div className="panel gridBg">
          <div className="panelHeader">
            <h1 className="text-lg font-semibold">Log in</h1>
            <p className="muted text-sm mt-1">
              Use your email + password to access your private notes.
            </p>
          </div>

          <div className="panelBody">
            <form className="flex flex-col gap-3 max-w-md" onSubmit={onSubmit}>
              {error ? (
                <Alert variant="error" title="Could not log in">
                  {error}
                </Alert>
              ) : null}

              <label className="text-sm">
                <div className="mb-1 muted">Email</div>
                <input
                  className="input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label className="text-sm">
                <div className="mb-1 muted">Password</div>
                <input
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </label>

              <button
                className={`button buttonPrimary ${!canSubmit ? "opacity-60 cursor-not-allowed" : ""}`}
                disabled={!canSubmit}
                type="submit"
              >
                {loading ? "Logging in…" : "Log in"}
              </button>

              <p className="text-sm muted">
                New here?{" "}
                <Link className="underline" href="/register">
                  Create an account
                </Link>
                .
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
