"use client";

import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import DatePicker from "@cloudscape-design/components/date-picker";
import Flashbar from "@cloudscape-design/components/flashbar";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Modal from "@cloudscape-design/components/modal";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Opponent {
  id: string;
  name: string;
}

interface NewNegotiationFormProps {
  gameId: string;
  teamName: string;
  opponents: Opponent[];
}

export function NewNegotiationForm({
  gameId,
  teamName,
  opponents,
}: NewNegotiationFormProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState<{
    label: string;
    value: string;
  } | null>(null);
  const [date1, setDate1] = useState("");
  const [date2, setDate2] = useState("");
  const [date3, setDate3] = useState("");
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const proposedDates = [date1, date2, date3].filter((d) => d !== "");

  const handleGenerateMessage = async () => {
    if (!selectedOpponent || proposedDates.length === 0) return;

    setGenerating(true);
    try {
      const res = await fetch(`/api/games/${gameId}/negotiations/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_name: teamName,
          opponent_name: selectedOpponent.label,
          proposed_dates: proposedDates,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage(data.message);
      }
    } catch {
      // フォールバックメッセージを使用
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOpponent || proposedDates.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/games/${gameId}/negotiations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opponent_team_id: selectedOpponent.value,
          proposed_dates: proposedDates,
          message: message || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "交渉の作成に失敗しました");
        return;
      }

      setVisible(false);
      setSelectedOpponent(null);
      setDate1("");
      setDate2("");
      setDate3("");
      setMessage("");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Container
        header={
          <Header
            variant="h2"
            actions={
              <Button variant="primary" onClick={() => setVisible(true)}>
                新しい交渉を開始
              </Button>
            }
          >
            交渉
          </Header>
        }
      >
        対戦相手を選択し、候補日を指定して交渉を開始できます。AIがメッセージを自動生成します。
      </Container>

      <Modal
        visible={visible}
        onDismiss={() => setVisible(false)}
        header="新しい交渉を開始"
        footer={
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={() => setVisible(false)}>
              キャンセル
            </Button>
            <Button
              variant="primary"
              loading={submitting}
              disabled={
                !selectedOpponent || proposedDates.length === 0 || submitting
              }
              onClick={handleSubmit}
            >
              交渉を作成
            </Button>
          </SpaceBetween>
        }
      >
        <SpaceBetween size="l">
          {error && (
            <Flashbar
              items={[
                {
                  type: "error",
                  content: error,
                  dismissible: true,
                  onDismiss: () => setError(null),
                  id: "create-negotiation-error",
                },
              ]}
            />
          )}

          <FormField label="対戦相手" description="交渉する相手チームを選択">
            <Select
              selectedOption={selectedOpponent}
              onChange={({ detail }) =>
                setSelectedOpponent(
                  detail.selectedOption as {
                    label: string;
                    value: string;
                  },
                )
              }
              options={opponents.map((o) => ({
                label: o.name,
                value: o.id,
              }))}
              placeholder="対戦相手を選択"
            />
          </FormField>

          <FormField label="候補日1" description="試合の候補日を指定">
            <DatePicker
              value={date1}
              onChange={({ detail }) => setDate1(detail.value)}
              placeholder="YYYY/MM/DD"
            />
          </FormField>

          <FormField label="候補日2 (任意)">
            <DatePicker
              value={date2}
              onChange={({ detail }) => setDate2(detail.value)}
              placeholder="YYYY/MM/DD"
            />
          </FormField>

          <FormField label="候補日3 (任意)">
            <DatePicker
              value={date3}
              onChange={({ detail }) => setDate3(detail.value)}
              placeholder="YYYY/MM/DD"
            />
          </FormField>

          <FormField
            label="メッセージ"
            description="AIで自動生成するか、手動で入力してください"
          >
            <SpaceBetween size="s">
              <Button
                onClick={handleGenerateMessage}
                loading={generating}
                disabled={
                  !selectedOpponent || proposedDates.length === 0 || generating
                }
              >
                AIでメッセージを生成
              </Button>
              <Textarea
                value={message}
                onChange={({ detail }) => setMessage(detail.value)}
                placeholder="交渉メッセージを入力..."
                rows={6}
              />
            </SpaceBetween>
          </FormField>
        </SpaceBetween>
      </Modal>
    </>
  );
}
