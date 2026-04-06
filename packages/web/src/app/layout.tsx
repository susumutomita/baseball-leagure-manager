import { CloudscapeProvider } from "@/components/CloudscapeProvider";
import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mound.app";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f1b2d",
};

export const metadata: Metadata = {
  title: {
    default: "mound",
    template: "%s | mound",
  },
  description: "チーム運営が、勝手に回る。草野球チーム向けマネジメントSaaS",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "mound",
    description: "チーム運営が、勝手に回る。草野球チーム向けマネジメントSaaS",
    url: siteUrl,
    siteName: "mound",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "mound",
    description: "チーム運営が、勝手に回る。",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen">
        <CloudscapeProvider>{children}</CloudscapeProvider>
      </body>
    </html>
  );
}
