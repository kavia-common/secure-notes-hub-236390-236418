"use client";

import React from "react";

export function Alert({
  variant,
  title,
  children,
}: {
  variant: "error" | "info";
  title?: string;
  children: React.ReactNode;
}) {
  const cls =
    variant === "error"
      ? "alert alertError"
      : "alert alertInfo";

  return (
    <div className={cls} role={variant === "error" ? "alert" : "status"}>
      {title ? <div className="font-semibold mb-1">{title}</div> : null}
      <div className="muted" style={{ color: "var(--text)" }}>
        {children}
      </div>
    </div>
  );
}
