"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import DatePicker from "@cloudscape-design/components/date-picker";
import FormField from "@cloudscape-design/components/form-field";
import Modal from "@cloudscape-design/components/modal";
import Select from "@cloudscape-design/components/select";
import type { SelectProps } from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import TokenGroup from "@cloudscape-design/components/token-group";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface OpponentOption {
  id: string;
  name: string;
  area: string | null;
}

interface NegotiationFormModalProps {
  visible: boolean;
  onDismiss: () => void;
  gameId: string;
  opponents: OpponentOption[];
}

export function NegotiationFormModal({
  visible,
  onDismiss,
  gameId,
  opponents,
}: NegotiationFormModalProps) {
  const router = useRouter();
  const [selectedOpponent, setSelectedOpponent] =
    useState<SelectProps.Option | null>(null);
  const [proposedDates, setProposedDates] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const opponentOptions: SelectProps.Option[] = opponents.map((o) => ({
    label: o.name,
    value: o.id,
    description: o.area ?? undefined,
  }));

  const handleDismiss = () => {
    setSelectedOpponent(null);
    setProposedDates([]);
    setDateInput("");
    setMessage("");
    setError(null);
    onDismiss();
  };

  const addDate = () => {
    if (dateInput && !proposedDates.includes(dateInput)) {
      setProposedDates([...proposedDates, dateInput]);
      setDateInput("");
    }
  };

  const handleSubmit = async () => {
    if (!selectedOpponent?.value) {
      setError("対戦相手を選択してください");
      return;
    }
    if (proposedDates.length === 0) {
      setError("候補日を1日以上追加してください");
      return;
    }

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
        const json = await res.json();
        setError(json.error ?? "交渉の作成に失敗しました");
        return;
      }

      router.refresh();
      handleDismiss();
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={handleDismiss}
      header="対戦交渉を作成"
      size="medium"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={handleDismiss}>
              キャンセル
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={submitting}
              disabled={!selectedOpponent || proposedDates.length === 0}
            >
              交渉を作成
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="l">
        {error && (
          <Box color="text-status-error" fontSize="body-s">
            {error}
          </Box>
        )}

        <FormField label="対戦相手" constraintText="必須">
          <Select
            selectedOption={selectedOpponent}
            onChange={({ detail }) =>
              setSelectedOpponent(detail.selectedOption)
            }
            options={opponentOptions}
            placeholder="対戦相手を選択"
            empty="対戦相手が登録されていません"
          />
        </FormField>

        <FormField label="候補日" constraintText="必須 — 1日以上追加">
          <SpaceBetween size="xs">
            <SpaceBetween direction="horizontal" size="xs">
              <DatePicker
                value={dateInput}
                onChange={({ detail }) => setDateInput(detail.value)}
                placeholder="YYYY/MM/DD"
              />
              <Button onClick={addDate} disabled={!dateInput}>
                追加
              </Button>
            </SpaceBetween>
            {proposedDates.length > 0 && (
              <TokenGroup
                items={proposedDates.map((d) => ({ label: d }))}
                onDismiss={({ detail }) => {
                  setProposedDates(
                    proposedDates.filter((_, i) => i !== detail.itemIndex),
                  );
                }}
              />
            )}
          </SpaceBetween>
        </FormField>

        <FormField label="メッセージ">
          <Textarea
            value={message}
            onChange={({ detail }) => setMessage(detail.value)}
            placeholder="対戦相手へのメッセージ（任意）"
            rows={3}
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}
