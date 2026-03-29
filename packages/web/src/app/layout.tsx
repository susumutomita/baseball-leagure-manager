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
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <a href="/" className="text-lg font-bold">
              試合成立エンジン
            </a>
            <nav className="flex gap-4 text-sm">
              <a href="/" className="hover:text-blue-600">
                ダッシュボード
              </a>
              <a href="/match-requests/new" className="hover:text-blue-600">
                試合作成
              </a>
              <a href="/negotiations" className="hover:text-blue-600">
                交渉管理
              </a>
              <a href="/grounds" className="hover:text-blue-600">
                グラウンド監視
              </a>
              <a href="/availability" className="hover:text-blue-600">
                出欠管理
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
