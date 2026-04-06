"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Checkbox from "@cloudscape-design/components/checkbox";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface HelperOption {
  id: string;
  name: string;
  reliability_score: number;
}

interface HelperRequestFormModalProps {
  visible: boolean;
  onDismiss: () => void;
  gameId: string;
  availableHelpers: HelperOption[];
}

export function HelperRequestFormModal({
  visible,
  onDismiss,
  gameId,
  availableHelpers,
}: HelperRequestFormModalProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDismiss = () => {
    setSelectedIds(new Set());
    setMessage("");
    setError(null);
    onDismiss();
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      setError("助っ人を1人以上選択してください");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/games/${gameId}/helper-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          helper_ids: Array.from(selectedIds),
          message: message || null,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "打診の送信に失敗しました");
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

  const toggleHelper = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  return (
    <Modal
      visible={visible}
      onDismiss={handleDismiss}
      header="助っ人を打診"
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
              disabled={selectedIds.size === 0}
            >
              {selectedIds.size}人に打診する
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

        {availableHelpers.length === 0 ? (
          <Box textAlign="center" color="text-body-secondary">
            打診可能な助っ人がいません
          </Box>
        ) : (
          <SpaceBetween size="xs">
            {availableHelpers.map((h) => (
              <Checkbox
                key={h.id}
                checked={selectedIds.has(h.id)}
                onChange={() => toggleHelper(h.id)}
              >
                {h.name}（信頼度: {(h.reliability_score * 100).toFixed(0)}%）
              </Checkbox>
            ))}
          </SpaceBetween>
        )}

        <Textarea
          value={message}
          onChange={({ detail }) => setMessage(detail.value)}
          placeholder="メッセージ（任意）"
          rows={3}
        />
      </SpaceBetween>
    </Modal>
  );
}
