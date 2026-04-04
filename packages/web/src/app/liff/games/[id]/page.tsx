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

function LoadingSpinner() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
      <p className="text-sm text-gray-500">読み込み中...</p>
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

function ConfirmationBanner({ response }: { response: string }) {
  const labels: Record<string, { text: string; color: string }> = {
    AVAILABLE: {
      text: "参加で回答しました",
      color: "bg-green-50 text-green-700",
    },
    UNAVAILABLE: {
      text: "不参加で回答しました",
      color: "bg-red-50 text-red-700",
    },
    MAYBE: {
      text: "未定で回答しました",
      color: "bg-yellow-50 text-yellow-700",
    },
  };
  const info = labels[response];
  if (!info) return null;

  return (
    <div
      className={`rounded-2xl p-3 text-center text-sm font-medium ${info.color}`}
    >
      {info.text}
    </div>
  );
}

export default function LiffGameRsvpPage() {
  const { id: gameId } = useParams<{ id: string }>();
  const { accessToken, profile, closeLiff } = useLiffContext();
  const [data, setData] = useState<MyRsvpResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentResponse, setCurrentResponse] = useState<string>("NO_RESPONSE");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const fetchData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/liff/games/${gameId}/my-rsvp`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 404) {
        const json = (await res.json()) as MyRsvpResponse;
        if (json.lineUserId) {
          setError(
            "LINE アカウントがメンバーに紐付いていません。先にメンバー登録を行ってください。",
          );
        } else {
          setError("指定された試合が見つかりません。URL をご確認ください。");
        }
        return;
      }
      if (!res.ok) {
        const json = (await res.json()) as MyRsvpResponse;
        setError(json.error ?? "データの取得に失敗しました");
        return;
      }
      const json = (await res.json()) as MyRsvpResponse;
      setData(json);
      setCurrentResponse(json.rsvp?.response ?? "NO_RESPONSE");
    } catch {
      setError("通信エラーが発生しました。電波状況をご確認ください。");
    } finally {
      setLoading(false);
    }
  }, [accessToken, gameId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRsvpUpdated = (newResponse: string) => {
    setCurrentResponse(newResponse);
    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 3000);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={fetchData} />;
  }

  if (!data) {
    return (
      <ErrorDisplay
        message="データが取得できませんでした"
        onRetry={fetchData}
      />
    );
  }

  const { game, rsvp } = data;

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
          <p className="text-sm font-medium">{data.member.name}</p>
          <p className="text-xs text-gray-500">{profile?.displayName}</p>
        </div>
      </div>

      {/* 確認フィードバック */}
      {showConfirmation && <ConfirmationBanner response={currentResponse} />}

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
          onUpdated={handleRsvpUpdated}
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
