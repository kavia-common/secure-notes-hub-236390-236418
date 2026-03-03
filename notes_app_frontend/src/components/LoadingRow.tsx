"use client";

export function LoadingRow({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm muted">
      <span
        aria-hidden="true"
        className="inline-block w-2 h-2 rounded-sm"
        style={{
          background: "linear-gradient(135deg, var(--accent), var(--accent2))",
          boxShadow: "0 0 16px rgba(59, 130, 246, 0.55)",
        }}
      />
      <span>{label || "Loading…"}</span>
    </div>
  );
}
