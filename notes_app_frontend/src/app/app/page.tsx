"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Alert } from "@/components/Alert";
import { LoadingRow } from "@/components/LoadingRow";
import { api, ApiError, Note } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { useDebouncedEffect } from "@/hooks/useDebouncedEffect";

type SaveState = "idle" | "saving" | "saved" | "error";

function formatUpdatedAt(note: Note): string {
  const iso = note.updated_at || note.created_at;
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function WorkspacePage() {
  const router = useRouter();

  const [token, setTokenState] = useState<string | null>(null);

  const [tags, setTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) || null,
    [notes, selectedId]
  );

  // Editor state (controlled)
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noteTagsText, setNoteTagsText] = useState("");

  const [listLoading, setListLoading] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveErrorRef = useRef<string | null>(null);

  const dirtyRef = useRef(false);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace("/login");
      return;
    }
    setTokenState(t);
  }, [router]);

  useEffect(() => {
    if (!token) return;

    // Capture token to a non-null local so TypeScript can narrow correctly in async.
    const currentToken = token;

    async function loadTags() {
      setTagsLoading(true);
      try {
        const data = await api.listTags(currentToken);
        setTags(data || []);
      } catch {
        // Tags are non-blocking; don't hard fail the workspace.
      } finally {
        setTagsLoading(false);
      }
    }

    loadTags();
  }, [token]);

  async function refreshNotes(currentToken: string, opts?: { keepSelection?: boolean }) {
    setListLoading(true);
    setError(null);
    try {
      const data = await api.listNotes(currentToken, { q: q.trim() || undefined, tag: activeTag });
      setNotes(data || []);

      if (!opts?.keepSelection) {
        setSelectedId(data?.[0]?.id ?? null);
      } else if (selectedId && !data.some((n) => n.id === selectedId)) {
        setSelectedId(data?.[0]?.id ?? null);
      }
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not load notes.";
      setError(msg);

      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        router.replace("/login");
      }
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    refreshNotes(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeTag]);

  // Search with debounce
  useDebouncedEffect(
    () => {
      if (!token) return;
      refreshNotes(token, { keepSelection: true });
    },
    [q],
    350
  );

  // When selection changes, populate editor state
  useEffect(() => {
    if (!selectedNote) {
      setTitle("");
      setContent("");
      setNoteTagsText("");
      dirtyRef.current = false;
      setSaveState("idle");
      saveErrorRef.current = null;
      return;
    }

    setTitle(selectedNote.title || "");
    setContent(selectedNote.content || "");
    setNoteTagsText((selectedNote.tags || []).join(", "));
    dirtyRef.current = false;
    setSaveState("idle");
    saveErrorRef.current = null;
  }, [selectedNote]);

  function parseTags(text: string): string[] {
    return text
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  async function createNewNote() {
    if (!token) return;
    setError(null);
    try {
      const created = await api.createNote(token, {
        title: "Untitled",
        content: "",
        tags: [],
      });
      // optimistic update
      setNotes((prev) => [created, ...prev]);
      setSelectedId(created.id);

      // refresh tag list (note may add tags later)
      try {
        const data = await api.listTags(token);
        setTags(data || []);
      } catch {
        // ignore
      }
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not create note.";
      setError(msg);
    }
  }

  async function deleteCurrentNote() {
    if (!token || !selectedNote) return;
    setError(null);
    try {
      await api.deleteNote(token, selectedNote.id);
      setNotes((prev) => prev.filter((n) => n.id !== selectedNote.id));
      setSelectedId((prev) => {
        if (prev !== selectedNote.id) return prev;
        const remaining = notes.filter((n) => n.id !== selectedNote.id);
        return remaining[0]?.id ?? null;
      });

      // refresh tags (deleting may reduce tag set)
      try {
        const data = await api.listTags(token);
        setTags(data || []);
      } catch {
        // ignore
      }
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not delete note.";
      setError(msg);
    }
  }

  // Mark dirty on edit
  useEffect(() => {
    if (!selectedNote) return;
    const nextTags = parseTags(noteTagsText);
    const changed =
      title !== (selectedNote.title || "") ||
      content !== (selectedNote.content || "") ||
      nextTags.join(",") !== (selectedNote.tags || []).join(",");
    dirtyRef.current = changed;
    if (changed && saveState === "saved") setSaveState("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, noteTagsText, selectedNote?.id]);

  // Autosave debounce
  useDebouncedEffect(
    () => {
      async function doSave() {
        if (!token || !selectedNote) return;
        if (!dirtyRef.current) return;

        setSaveState("saving");
        saveErrorRef.current = null;
        try {
          const updated = await api.updateNote(token, selectedNote.id, {
            title,
            content,
            tags: parseTags(noteTagsText),
          });

          setNotes((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );

          // update sidebar tags after edit (non-blocking)
          api
            .listTags(token)
            .then((data) => setTags(data || []))
            .catch(() => {});

          dirtyRef.current = false;
          setSaveState("saved");
        } catch (err) {
          const msg =
            err instanceof ApiError ? err.message : "Autosave failed.";
          saveErrorRef.current = msg;
          setSaveState("error");

          if (err instanceof ApiError && err.status === 401) {
            clearToken();
            router.replace("/login");
          }
        }
      }

      doSave();
    },
    [title, content, noteTagsText, selectedNote?.id, token],
    650
  );

  const saveBadge = useMemo(() => {
    if (!selectedNote) return null;

    if (saveState === "saving")
      return <span className="badge badgeActive">Saving…</span>;
    if (saveState === "saved") return <span className="badge">Saved</span>;
    if (saveState === "error")
      return <span className="badge" style={{ borderColor: "rgba(239, 68, 68, 0.45)" }}>Save error</span>;
    if (dirtyRef.current)
      return <span className="badge badgeActive">Edited</span>;
    return <span className="badge">Up to date</span>;
  }, [saveState, selectedNote]);

  return (
    <div className="appShell">
      <TopBar />

      <main className="container">
        <div className="panel gridBg">
          <div className="panelHeader flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-lg font-semibold">Workspace</h1>
                <p className="muted text-sm mt-1">
                  Search, filter by tag, edit in-place. Autosave runs after you pause typing.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button className="button buttonPrimary" onClick={createNewNote}>
                  + New note
                </button>
                <span className="badge">
                  <span className="muted">Tip:</span> <span className="kbd">Ctrl</span> <span className="kbd">F</span> to search in page
                </span>
              </div>
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              <input
                className="input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search notes by title/content…"
                aria-label="Search notes"
              />
              <div className="muted text-sm whitespace-nowrap">
                {listLoading ? "Updating…" : `${notes.length} note(s)`}
              </div>
            </div>

            {error ? (
              <Alert variant="error" title="Something went wrong">
                {error}
              </Alert>
            ) : null}
          </div>

          <div className="panelBody">
            <div className="grid grid-cols-1 lg:grid-cols-[260px_320px_1fr] gap-4">
              {/* Sidebar: tags */}
              <aside className="panel" style={{ boxShadow: "none" }}>
                <div className="panelHeader flex items-center justify-between">
                  <div className="font-semibold">Tags</div>
                  {tagsLoading ? <span className="muted text-xs">loading…</span> : null}
                </div>
                <div className="panelBody flex flex-col gap-2">
                  <button
                    className={`button text-left ${activeTag === null ? "buttonPrimary" : ""}`}
                    onClick={() => setActiveTag(null)}
                  >
                    All notes
                  </button>

                  {tags.length === 0 ? (
                    <div className="muted text-sm">
                      No tags yet. Add tags in the editor, separated by commas.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((t) => (
                        <button
                          key={t}
                          className={`badge ${activeTag === t ? "badgeActive" : ""}`}
                          onClick={() => setActiveTag((prev) => (prev === t ? null : t))}
                        >
                          #{t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </aside>

              {/* Notes list */}
              <section className="panel" style={{ boxShadow: "none" }}>
                <div className="panelHeader flex items-center justify-between">
                  <div className="font-semibold">Notes</div>
                  {listLoading ? <span className="muted text-xs">loading…</span> : null}
                </div>
                <div className="panelBody flex flex-col gap-2">
                  {listLoading ? <LoadingRow label="Loading notes…" /> : null}
                  {!listLoading && notes.length === 0 ? (
                    <div className="muted text-sm">
                      No notes found. Try clearing filters or create a new note.
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-2">
                    {notes.map((n) => (
                      <button
                        key={n.id}
                        className={`button text-left ${selectedId === n.id ? "buttonPrimary" : ""}`}
                        onClick={() => setSelectedId(n.id)}
                      >
                        <div className="font-semibold truncate">
                          {n.title?.trim() ? n.title : "Untitled"}
                        </div>
                        <div className="muted text-xs mt-1">
                          Updated: {formatUpdatedAt(n)}
                        </div>
                        {n.tags?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {n.tags.slice(0, 4).map((t) => (
                              <span key={t} className="badge">
                                #{t}
                              </span>
                            ))}
                            {n.tags.length > 4 ? (
                              <span className="badge muted">+{n.tags.length - 4}</span>
                            ) : null}
                          </div>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Editor */}
              <section className="panel" style={{ boxShadow: "none" }}>
                <div className="panelHeader flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-semibold">Editor</div>
                  <div className="flex items-center gap-2">
                    {saveBadge}
                    <button
                      className={`button buttonDanger ${!selectedNote ? "opacity-60 cursor-not-allowed" : ""}`}
                      disabled={!selectedNote}
                      onClick={deleteCurrentNote}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="panelBody flex flex-col gap-3">
                  {!selectedNote ? (
                    <div className="muted text-sm">
                      Select a note to edit, or create a new one.
                    </div>
                  ) : (
                    <>
                      {saveState === "error" && saveErrorRef.current ? (
                        <Alert variant="error" title="Autosave failed">
                          {saveErrorRef.current}
                        </Alert>
                      ) : null}

                      <label className="text-sm">
                        <div className="mb-1 muted">Title</div>
                        <input
                          className="input"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Note title…"
                        />
                      </label>

                      <label className="text-sm">
                        <div className="mb-1 muted">Tags</div>
                        <input
                          className="input"
                          value={noteTagsText}
                          onChange={(e) => setNoteTagsText(e.target.value)}
                          placeholder="e.g. work, personal, ideas"
                        />
                      </label>

                      <label className="text-sm">
                        <div className="mb-1 muted">Content</div>
                        <textarea
                          className="textarea"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Start typing… autosave will kick in."
                        />
                      </label>

                      <div className="muted text-xs">
                        Autosave: triggers ~650ms after typing stops. Search uses a ~350ms debounce.
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
