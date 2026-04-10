"use client";

import { useLiffContext } from "@/components/liff/LiffProvider";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Member {
  id: string;
  name: string;
  line_user_id: string | null;
}

function LoadingSpinner() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
      <p className="text-sm text-gray-500">メンバー情報を読み込み中...</p>
    </div>
  );
}

function ErrorDisplay({
  message,
  onRetry,
}: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-red-50 p-6 text-center">
        <div className="mb-3 text-3xl">&#9888;</div>
        <p className="text-sm font-medium text-red-700">エラー</p>
        <p className="mt-2 text-sm text-red-600">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-xl bg-red-100 px-6 py-2 text-sm font-medium text-red-700 active:bg-red-200"
          >
            再試行
          </button>
        )}
      </div>
    </div>
  );
}

export default function LiffRegisterPage() {
  const { accessToken, profile } = useLiffContext();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("code");
  const teamId = searchParams.get("team_id");

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    const resolvedTeamId = inviteCode
      ? await (async () => {
          const inviteRes = await fetch(`/api/invitations/${inviteCode}`);
          if (!inviteRes.ok) {
            if (inviteRes.status === 404) {
              setFetchError("招待コードが見つかりません。");
            } else {
              const inviteJson = await inviteRes.json().catch(() => null);
              setFetchError(
                inviteJson?.error?.message ??
                  "招待リンクの検証に失敗しました。",
              );
            }
            return null;
          }

          const inviteJson = (await inviteRes.json()) as {
            data?: { team_id?: string };
          };
          return inviteJson.data?.team_id ?? null;
        })()
      : teamId;

    if (!resolvedTeamId) {
      setLoading(false);
      return;
    }

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
      if (!supabaseUrl || !supabaseKey) {
        setFetchError(
          "設定エラーが発生しました。管理者にお問い合わせください。",
        );
        return;
      }

      const membersRes = await fetch(
        `${supabaseUrl}/rest/v1/members?team_id=eq.${resolvedTeamId}&status=eq.ACTIVE&select=id,name,line_user_id&order=name`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        },
      );
      if (!membersRes.ok) {
        if (membersRes.status === 404) {
          setFetchError("指定されたチームが見つかりません。");
        } else {
          setFetchError("メンバー情報の取得に失敗しました。");
        }
        return;
      }
      setMembers((await membersRes.json()) as Member[]);
    } catch {
      setFetchError("通信エラーが発生しました。電波状況をご確認ください。");
    } finally {
      setLoading(false);
    }
  }, [inviteCode, teamId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRegister = async (memberId: string) => {
    if (!accessToken) return;
    setRegistering(true);
    setSelectedId(memberId);
    setResult(null);

    try {
      const res = await fetch("/api/liff/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          member_id: memberId,
          invite_code: inviteCode,
        }),
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
      setSelectedId(null);
    }
  };

  if (!teamId && !inviteCode) {
    return (
      <ErrorDisplay message="招待コードが指定されていません。正しいリンクからアクセスしてください。" />
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (fetchError) {
    return <ErrorDisplay message={fetchError} onRetry={fetchMembers} />;
  }

  if (result?.success) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-green-50 p-6 text-center">
          <div className="mb-2 text-4xl">&#9989;</div>
          <p className="text-lg font-bold text-green-700">登録完了</p>
          <p className="mt-2 text-sm text-green-600">{result.message}</p>
          <p className="mt-4 text-xs text-gray-500">
            今後は出欠リンクを開くだけで自動的にあなたの回答画面が表示されます
          </p>
        </div>
      </div>
    );
  }

  const availableMembers = members.filter((m) => !m.line_user_id);

  return (
    <div className="space-y-4 p-4 pb-8">
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
          {availableMembers.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={registering}
              onClick={() => handleRegister(m.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm active:bg-gray-50 disabled:opacity-50"
            >
              <span className="font-medium">{m.name}</span>
              {registering && selectedId === m.id ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
              ) : (
                <span className="text-xs text-blue-500">選択</span>
              )}
            </button>
          ))}
          {availableMembers.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              登録可能なメンバーがいません
              <p className="mt-1 text-xs">
                すべてのメンバーが既に LINE 連携済みです
              </p>
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
