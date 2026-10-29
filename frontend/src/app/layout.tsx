import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nova — Search the web, answered by AI",
  description:
    "A fast AI-powered metasearch engine that searches DuckDuckGo, Bing and Wikipedia at once.",
};

const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t="dark";}var r=document.documentElement;r.dataset.theme=t;r.classList.toggle("dark",t==="dark");}catch(e){var r=document.documentElement;r.dataset.theme="dark";r.classList.add("dark");}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="dark"
      data-scroll-behavior="smooth"
      className="dark"
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
