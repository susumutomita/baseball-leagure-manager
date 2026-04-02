export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <a href="/" className="text-lg font-bold">
            試合成立エンジン
          </a>
          <nav className="flex gap-4 text-sm">
            <a href="/" className="hover:text-blue-600">
              ダッシュボード
            </a>
            <a href="/games/new" className="hover:text-blue-600">
              試合作成
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </>
  );
}
