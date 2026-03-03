import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Secure Notes Hub",
  description: "Retro-themed secure notes app with tags, search, and autosave.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
