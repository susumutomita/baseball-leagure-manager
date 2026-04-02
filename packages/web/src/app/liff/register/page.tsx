"use client";

import { useLiffContext } from "@/components/liff/LiffProvider";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Member {
  id: string;
  name: string;
  line_user_id: string | null;
}

export default function LiffRegisterPage() {
  const { accessToken, profile } = useLiffContext();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("team_id");

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!teamId) {
      setLoading(false);
      return;
    }
    try {
      // Supabase REST APIでメンバー一覧を取得
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
      if (!supabaseUrl || !supabaseKey) return;

      const membersRes = await fetch(
        `${supabaseUrl}/rest/v1/members?team_id=eq.${teamId}&status=eq.ACTIVE&select=id,name,line_user_id&order=name`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        },
      );
      if (membersRes.ok) {
        setMembers((await membersRes.json()) as Member[]);
      }
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRegister = async (memberId: string) => {
    if (!accessToken) return;
    setRegistering(true);
    setResult(null);

    try {
      const res = await fetch("/api/liff/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ member_id: memberId }),
      });

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        member?: { name: string };
      };

      if (res.ok) {
        setResult({
          success: true,
          message: `${json.member?.name ?? "メンバー"} として登録しました`,
        });
      } else {
        setResult({
          success: false,
          message: json.error ?? "登録に失敗しました",
        });
      }
    } catch {
      setResult({ success: false, message: "通信エラーが発生しました" });
    } finally {
      setRegistering(false);
    }
  };

  if (!teamId) {
    return (
      <div className="p-4">
        <div className="rounded-2xl bg-red-50 p-4 text-center">
          <p className="text-sm text-red-600">チームIDが指定されていません</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (result?.success) {
    return (
      <div className="p-4">
        <div className="rounded-2xl bg-green-50 p-6 text-center">
          <p className="text-lg font-bold text-green-700">登録完了</p>
          <p className="mt-2 text-sm text-green-600">{result.message}</p>
          <p className="mt-4 text-xs text-gray-500">
            今後は出欠リンクを開くだけで自動的にあなたの回答画面が表示されます
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* ユーザー情報 */}
      <div className="flex items-center gap-3">
        {profile?.pictureUrl && (
          <img
            src={profile.pictureUrl}
            alt=""
            className="h-10 w-10 rounded-full"
          />
        )}
        <div>
          <p className="text-sm font-medium">{profile?.displayName}</p>
          <p className="text-xs text-gray-500">
            LINE アカウントとメンバーを紐付けます
          </p>
        </div>
      </div>

      {/* メンバー一覧 */}
      <div className="rounded-2xl bg-white shadow-sm">
        <p className="border-b px-4 py-3 text-sm font-medium">
          あなたの名前を選んでください
        </p>
        <div className="divide-y">
          {members
            .filter((m) => !m.line_user_id)
            .map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={registering}
                onClick={() => handleRegister(m.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm active:bg-gray-50 disabled:opacity-50"
              >
                <span className="font-medium">{m.name}</span>
                <span className="text-xs text-blue-500">選択</span>
              </button>
            ))}
          {members.filter((m) => !m.line_user_id).length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              登録可能なメンバーがいません
            </div>
          )}
        </div>
      </div>

      {result && !result.success && (
        <div className="rounded-2xl bg-red-50 p-3 text-center">
          <p className="text-sm text-red-600">{result.message}</p>
        </div>
      )}
    </div>
  );
}
