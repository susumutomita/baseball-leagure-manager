import { createClient } from "@/lib/supabase/server";

export default async function TeamsPage() {
  const supabase = await createClient();

  const { data: teams } = await supabase
    .from("teams")
    .select("*, members(count)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">チーム一覧</h1>
        <a
          href="/teams/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          チーム作成
        </a>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">チーム名</th>
              <th className="px-4 py-3">活動エリア</th>
              <th className="px-4 py-3">メンバー数</th>
              <th className="px-4 py-3">作成日</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {teams?.map((t) => {
              const memberCount =
                (t.members as unknown as { count: number }[])?.[0]?.count ?? 0;
              return (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <a
                      href={`/teams/${t.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {t.name}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{t.home_area}</td>
                  <td className="px-4 py-3">{memberCount}人</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(t.created_at).toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              );
            })}
            {(!teams || teams.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  チームがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
