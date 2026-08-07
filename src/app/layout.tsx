import type { Metadata } from "next";
// Self-hosted rather than next/font/google: the woff2 files ship inside the
// `geist` package, so a build never depends on reaching fonts.googleapis.com.
// Same typeface, same --font-geist-* variables globals.css already binds to.
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nova",
  description: "Nova — Life Operating System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      {/*
        Providers deliberately do NOT live here. TelegramProvider withholds
        its children until the Mini App SDK has settled, which would leave the
        public marketing pages with no server-rendered HTML — fatal for SEO,
        link previews and LCP. Each route group that actually needs the
        Telegram session mounts them itself: (app) and onboarding.
      */}
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
