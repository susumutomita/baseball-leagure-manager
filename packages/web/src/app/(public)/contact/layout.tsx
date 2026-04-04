import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "お問い合わせ - mound",
  description:
    "mound へのお問い合わせはこちらから。ご質問・ご要望をお気軽にお送りください。",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
