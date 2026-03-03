"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import Link from "next/link";
import { getToken } from "@/lib/auth";

export default function Home() {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(!!getToken());
  }, []);

  return (
    <div className="appShell">
      <TopBar />
      <main className="container">
        <section className="panel gridBg">
          <header className="panelHeader">
            <h1 className="text-xl font-semibold">Secure Notes Hub</h1>
            <p className="muted text-sm mt-1">
              Private cloud notes with tags, search, and autosave—wrapped in a retro UI.
            </p>
          </header>

          <div className="panelBody">
            <div className="flex flex-col gap-3 max-w-2xl">
              <p className="muted">
                Use the workspace to create, edit, delete, and search notes. Notes are synced via the backend API and are visible only to you.
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                {hasToken ? (
                  <Link className="button buttonPrimary" href="/app">
                    Go to workspace
                  </Link>
                ) : (
                  <>
                    <Link className="button buttonPrimary" href="/register">
                      Create account
                    </Link>
                    <Link className="button" href="/login">
                      Log in
                    </Link>
                  </>
                )}
              </div>

              <div className="panel" style={{ boxShadow: "none" }}>
                <div className="panelHeader">
                  <div className="font-semibold">Quick notes</div>
                </div>
                <div className="panelBody">
                  <ul className="muted text-sm flex flex-col gap-2">
                    <li>
                      <span className="badge">Autosave</span> saves after you pause typing.
                    </li>
                    <li>
                      <span className="badge">Tags</span> filter notes from the sidebar.
                    </li>
                    <li>
                      <span className="badge">Search</span> looks through title/content.
                    </li>
                  </ul>
                </div>
              </div>

              <p className="muted text-xs">
                Backend base URL is read from <span className="kbd">NEXT_PUBLIC_API_BASE</span> (or <span className="kbd">NEXT_PUBLIC_BACKEND_URL</span>).
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
