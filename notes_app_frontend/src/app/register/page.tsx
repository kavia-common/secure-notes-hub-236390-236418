"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/Alert";
import { TopBar } from "@/components/TopBar";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const validationError = useMemo(() => {
    if (password.length > 0 && password.length < 6) return "Password must be at least 6 characters.";
    if (confirm.length > 0 && confirm !== password) return "Passwords do not match.";
    return null;
  }, [password, confirm]);

  const canSubmit = useMemo(() => {
    return (
      email.trim().length > 3 &&
      password.length >= 6 &&
      confirm === password &&
      !loading
    );
  }, [email, password, confirm, loading]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const tokens = await api.register(email.trim(), password);
      setToken(tokens.access_token);
      router.push("/app");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Registration failed. Please try again.";
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
            <h1 className="text-lg font-semibold">Create account</h1>
            <p className="muted text-sm mt-1">
              Your notes are private—only you can access them.
            </p>
          </div>

          <div className="panelBody">
            <form className="flex flex-col gap-3 max-w-md" onSubmit={onSubmit}>
              {error ? (
                <Alert variant="error" title="Could not create account">
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
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                />
              </label>

              <label className="text-sm">
                <div className="mb-1 muted">Confirm password</div>
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  required
                />
              </label>

              {validationError ? (
                <Alert variant="info" title="Tip">
                  {validationError}
                </Alert>
              ) : null}

              <button
                className={`button buttonPrimary ${!canSubmit ? "opacity-60 cursor-not-allowed" : ""}`}
                disabled={!canSubmit}
                type="submit"
              >
                {loading ? "Creating…" : "Create account"}
              </button>

              <p className="text-sm muted">
                Already have an account?{" "}
                <Link className="underline" href="/login">
                  Log in
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
