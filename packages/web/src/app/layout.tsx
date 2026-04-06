import { CloudscapeProvider } from "@/components/CloudscapeProvider";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "mound",
  description: "チーム運営が、勝手に回る。",
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
