import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
/* Subset of Material Symbols Rounded (only the icons this app uses), variable FILL/opsz axes. */
const symbols = localFont({
  src: "./fonts/MaterialSymbolsRounded.woff2",
  variable: "--font-symbols",
  display: "block",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Lumen Finance",
  description: "A glassmorphic personal finance dashboard. Log income and expenses, see cash flow and spending at a glance.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef0f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b1a" },
  ],
};

/* Applies the saved theme before first paint so there is no flash. */
const themeScript = `(function(){try{var t=localStorage.getItem("lumen:theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${symbols.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
