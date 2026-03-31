import { createClient } from "@/lib/supabase/server";
import { AddMemberForm } from "./AddMemberForm";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .single();

  if (!team) {
    return (
      <div className="py-12 text-center text-gray-500">
        チームが見つかりません
      </div>
    );
  }

  const { data: members } = await supabase
    .from("members")
    .select("*")
    .eq("team_id", id)
    .order("name");

  const activeMembers = members?.filter((m) => m.status === "ACTIVE") ?? [];
  const inactiveMembers = members?.filter((m) => m.status !== "ACTIVE") ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{team.name}</h1>
        <p className="mt-1 text-sm text-gray-500">{team.home_area}</p>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border bg-white p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-gray-500">メンバー数</dt>
          <dd className="mt-0.5 font-medium">{activeMembers.length}人</dd>
        </div>
        <div>
          <dt className="text-gray-500">レベル帯</dt>
          <dd className="mt-0.5 font-medium">{team.level_band ?? "未設定"}</dd>
        </div>
        <div>
          <dt className="text-gray-500">作成日</dt>
          <dd className="mt-0.5 font-medium">
            {new Date(team.created_at).toLocaleDateString("ja-JP")}
          </dd>
        </div>
      </dl>

      {/* メンバー追加フォーム */}
      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">メンバー追加</h2>
        <AddMemberForm teamId={id} />
      </section>

      {/* メンバー一覧 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          メンバー一覧 ({activeMembers.length}人)
        </h2>
        <MemberTable members={activeMembers} />
      </section>

      {inactiveMembers.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-500">
            非アクティブ ({inactiveMembers.length}人)
          </h2>
          <MemberTable members={inactiveMembers} />
        </section>
      )}
    </div>
  );
}

interface MemberRow {
  id: string;
  name: string;
  tier: string;
  email: string | null;
  jersey_number: number | null;
  positions_json: string[] | null;
  status: string;
}

function MemberTable({ members }: { members: MemberRow[] }) {
  if (members.length === 0) {
    return (
      <p className="rounded-lg border bg-white px-4 py-8 text-center text-sm text-gray-400">
        メンバーがいません
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50 text-xs text-gray-500">
          <tr>
            <th className="px-4 py-2">背番号</th>
            <th className="px-4 py-2">名前</th>
            <th className="px-4 py-2">区分</th>
            <th className="px-4 py-2">ポジション</th>
            <th className="px-4 py-2">ステータス</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {members.map((m) => (
            <tr key={m.id}>
              <td className="px-4 py-2 text-gray-500">
                {m.jersey_number ?? "—"}
              </td>
              <td className="px-4 py-2 font-medium">{m.name}</td>
              <td className="px-4 py-2">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    m.tier === "PRO"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {m.tier}
                </span>
              </td>
              <td className="px-4 py-2 text-gray-500">
                {m.positions_json?.join(", ") || "—"}
              </td>
              <td className="px-4 py-2">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    m.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {m.status === "ACTIVE" ? "アクティブ" : m.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
