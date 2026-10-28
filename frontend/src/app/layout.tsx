import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nova — Search the web, answered by AI",
  description: "A fast AI-powered metasearch engine that searches DuckDuckGo, Bing and Wikipedia at once.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}