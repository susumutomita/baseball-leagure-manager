import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "試合成立エンジン",
  description: "草野球チーム向け試合成立エンジン SaaS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
