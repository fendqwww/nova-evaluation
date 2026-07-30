import type { Metadata } from "next";
// Self-hosted rather than next/font/google: the woff2 files ship inside the
// `geist` package, so a build never depends on reaching fonts.googleapis.com.
// Same typeface, same --font-geist-* variables globals.css already binds to.
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { TelegramProvider } from "@/components/providers/telegram-provider";
import { QueryProvider } from "@/components/providers/query-provider";
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
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <QueryProvider>
          <TelegramProvider>{children}</TelegramProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
