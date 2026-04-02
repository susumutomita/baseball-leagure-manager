import { LiffProvider } from "@/components/liff/LiffProvider";

export const metadata = {
  title: "出欠回答",
  description: "LINE ミニアプリで出欠回答",
};

export default function LiffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LiffProvider>{children}</LiffProvider>;
}
