"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Spinner from "@cloudscape-design/components/spinner";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import { validateRsvpToken } from "@match-engine/core";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface GameInfo {
  title: string;
  game_date: string | null;
  start_time: string | null;
  ground_name: string | null;
  available_count: number;
  min_players: number;
}

interface RsvpInfo {
  id: string;
  response: string;
  member_name: string;
}

const RESPONSE_LABELS: Record<string, string> = {
  AVAILABLE: "参加",
  UNAVAILABLE: "不参加",
  MAYBE: "未定",
  NO_RESPONSE: "未回答",
};

export default function WebRsvpPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<GameInfo | null>(null);
  const [rsvp, setRsvp] = useState<RsvpInfo | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const validation = validateRsvpToken(token);
    if (!validation.valid || !validation.payload) {
      setError(validation.reason ?? "無効なリンクです");
      setLoading(false);
      return;
    }

    const { gameId, rsvpId, memberId } = validation.payload;

    async function load() {
      try {
        // ゲーム情報取得
        const gameRes = await fetch(`/api/games/${gameId}`);
        if (!gameRes.ok) throw new Error("試合情報の取得に失敗しました");
        const gameJson = await gameRes.json();
        const g = gameJson.data;
        setGame({
          title: g.title,
          game_date: g.game_date,
          start_time: g.start_time,
          ground_name: g.ground_name,
          available_count: g.available_count,
          min_players: g.min_players,
        });

        // RSVP情報取得
        const rsvpRes = await fetch(`/api/games/${gameId}/rsvps`);
        if (rsvpRes.ok) {
          const rsvpJson = await rsvpRes.json();
          const myRsvp = (rsvpJson.data ?? []).find(
            (r: { id: string }) => r.id === rsvpId,
          );
          if (myRsvp) {
            setRsvp({
              id: myRsvp.id,
              response: myRsvp.response,
              member_name: myRsvp.member_name ?? memberId,
            });
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "データの取得に失敗しました",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  const handleRespond = async (response: string) => {
    if (!rsvp) return;
    setSubmitting(response);
    setSuccess(false);

    try {
      const res = await fetch(`/api/rsvps/${rsvp.id}/web`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, response }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "回答の送信に失敗しました");
        return;
      }

      setRsvp({ ...rsvp, response });
      setSuccess(true);
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center" }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (error && !game) {
    return (
      <div style={{ padding: "48px 24px", maxWidth: 480, margin: "0 auto" }}>
        <Container>
          <SpaceBetween size="m">
            <Box textAlign="center" fontSize="heading-l" fontWeight="bold">
              mound
            </Box>
            <Box textAlign="center" color="text-status-error">
              {error}
            </Box>
            <Box textAlign="center">
              <Button href="/">トップに戻る</Button>
            </Box>
          </SpaceBetween>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: 480, margin: "0 auto" }}>
      <SpaceBetween size="l">
        <Box textAlign="center" fontSize="heading-l" fontWeight="bold">
          mound
        </Box>

        <Container header={<Header variant="h2">{game?.title}</Header>}>
          <SpaceBetween size="s">
            <div>
              <Box variant="awsui-key-label">日時</Box>
              <Box>
                {game?.game_date ?? "未定"}
                {game?.start_time ? ` ${game.start_time}〜` : ""}
              </Box>
            </div>
            <div>
              <Box variant="awsui-key-label">場所</Box>
              <Box>{game?.ground_name ?? "未定"}</Box>
            </div>
            <div>
              <Box variant="awsui-key-label">参加状況</Box>
              <StatusIndicator
                type={
                  (game?.available_count ?? 0) >= (game?.min_players ?? 9)
                    ? "success"
                    : "warning"
                }
              >
                {game?.available_count ?? 0}/{game?.min_players ?? 9}人
              </StatusIndicator>
            </div>
          </SpaceBetween>
        </Container>

        <Container
          header={
            <Header variant="h2">{rsvp?.member_name ?? ""}さんの出欠</Header>
          }
        >
          <SpaceBetween size="m">
            {rsvp && (
              <Box textAlign="center">
                現在の回答:{" "}
                <strong>
                  {RESPONSE_LABELS[rsvp.response] ?? rsvp.response}
                </strong>
              </Box>
            )}

            {error && (
              <Box textAlign="center" color="text-status-error">
                {error}
              </Box>
            )}

            {success && (
              <Box textAlign="center" color="text-status-success">
                回答を送信しました
              </Box>
            )}

            <SpaceBetween size="s">
              <Button
                variant={rsvp?.response === "AVAILABLE" ? "primary" : "normal"}
                fullWidth
                onClick={() => handleRespond("AVAILABLE")}
                loading={submitting === "AVAILABLE"}
                disabled={submitting !== null}
              >
                参加する
              </Button>
              <Button
                variant={
                  rsvp?.response === "UNAVAILABLE" ? "primary" : "normal"
                }
                fullWidth
                onClick={() => handleRespond("UNAVAILABLE")}
                loading={submitting === "UNAVAILABLE"}
                disabled={submitting !== null}
              >
                不参加
              </Button>
              <Button
                variant={rsvp?.response === "MAYBE" ? "primary" : "normal"}
                fullWidth
                onClick={() => handleRespond("MAYBE")}
                loading={submitting === "MAYBE"}
                disabled={submitting !== null}
              >
                未定
              </Button>
            </SpaceBetween>
          </SpaceBetween>
        </Container>
      </SpaceBetween>
    </div>
  );
}
