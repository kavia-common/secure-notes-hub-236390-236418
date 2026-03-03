"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearToken, getToken, subscribeAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export function TopBar() {
  const [token, setTokenState] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setTokenState(getToken());
    return subscribeAuth((t) => setTokenState(t));
  }, []);

  return (
    <header className="topBar">
      <div className="topBarInner">
        <div className="brand">
          <span className="brandMark" aria-hidden="true" />
          <div>
            <div className="brandTitle">Secure Notes Hub</div>
            <div className="brandSub">retro cloud notes • autosave • tags</div>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          {token ? (
            <>
              <Link className="button" href="/app">
                Workspace
              </Link>
              <button
                className="button buttonDanger"
                onClick={() => {
                  clearToken();
                  router.push("/login");
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link className="button" href="/login">
                Log in
              </Link>
              <Link className="button buttonPrimary" href="/register">
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
