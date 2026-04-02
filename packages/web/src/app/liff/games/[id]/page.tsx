"use client";

import { useLiffContext } from "@/components/liff/LiffProvider";
import { RsvpCard } from "@/components/liff/RsvpCard";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface GameData {
  id: string;
  title: string;
  game_type: string;
  status: string;
  game_date: string | null;
  start_time: string | null;
  end_time: string | null;
  ground_name: string | null;
  available_count: number;
  unavailable_count: number;
  maybe_count: number;
  no_response_count: number;
}

interface RsvpData {
  id: string;
  response: string;
}

interface MyRsvpResponse {
  member: { id: string; name: string };
  game: GameData;
  rsvp: RsvpData | null;
  error?: string;
  lineUserId?: string;
}

const GAME_TYPE_LABELS: Record<string, string> = {
  PRACTICE: "練習",
  FRIENDLY: "練習試合",
  LEAGUE: "リーグ戦",
  TOURNAMENT: "大会",
};

export default function LiffGameRsvpPage() {
  const { id: gameId } = useParams<{ id: string }>();
  const { accessToken, profile, closeLiff } = useLiffContext();
  const [data, setData] = useState<MyRsvpResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentResponse, setCurrentResponse] = useState<string>("NO_RESPONSE");

  const fetchData = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`/api/liff/games/${gameId}/my-rsvp`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = (await res.json()) as MyRsvpResponse;
      if (!res.ok) {
        if (res.status === 404 && json.lineUserId) {
          setError(
            "LINE アカウントがメンバーに紐付いていません。先にメンバー登録を行ってください。",
          );
        } else {
          setError(json.error ?? "データの取得に失敗しました");
        }
        return;
      }
      setData(json);
      setCurrentResponse(json.rsvp?.response ?? "NO_RESPONSE");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [accessToken, gameId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-2xl bg-red-50 p-4 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { game, rsvp } = data;

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
          <p className="text-sm font-medium">{data.member.name}</p>
          <p className="text-xs text-gray-500">{profile?.displayName}</p>
        </div>
      </div>

      {/* 試合情報カード */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h1 className="text-lg font-bold">{game.title}</h1>
        <p className="mt-1 text-xs text-gray-500">
          {GAME_TYPE_LABELS[game.game_type] ?? game.game_type}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-gray-500">日程</p>
            <p className="font-medium">{game.game_date ?? "未定"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">時間</p>
            <p className="font-medium">
              {game.start_time
                ? `${game.start_time.slice(0, 5)}${game.end_time ? `〜${game.end_time.slice(0, 5)}` : ""}`
                : "未定"}
            </p>
          </div>
          {game.ground_name && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500">場所</p>
              <p className="font-medium">{game.ground_name}</p>
            </div>
          )}
        </div>

        {/* 出欠サマリー */}
        <div className="mt-3 flex gap-3 border-t pt-3 text-xs">
          <span className="text-green-600">参加 {game.available_count}</span>
          <span className="text-red-600">不参加 {game.unavailable_count}</span>
          <span className="text-yellow-600">未定 {game.maybe_count}</span>
          <span className="text-gray-400">未回答 {game.no_response_count}</span>
        </div>
      </div>

      {/* 出欠回答 */}
      {rsvp ? (
        <RsvpCard
          rsvpId={rsvp.id}
          currentResponse={currentResponse}
          accessToken={accessToken ?? ""}
          gameStatus={game.status}
          onUpdated={setCurrentResponse}
        />
      ) : (
        <div className="rounded-2xl bg-gray-50 p-4 text-center">
          <p className="text-sm text-gray-500">
            この試合の出欠データがありません
          </p>
        </div>
      )}

      {/* 閉じるボタン */}
      <button
        type="button"
        onClick={closeLiff}
        className="w-full rounded-xl bg-gray-100 py-3 text-sm text-gray-600 active:bg-gray-200"
      >
        閉じる
      </button>
    </div>
  );
}
