"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import { useEffect, useState } from "react";

interface Opponent {
  id: string;
  name: string;
  area?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_line?: string | null;
  contact_phone?: string | null;
  home_ground?: string | null;
  note?: string | null;
}

interface OpponentFormModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: () => void;
  teamId: string;
  opponent?: Opponent | null;
}

export function OpponentFormModal({
  visible,
  onDismiss,
  onSuccess,
  teamId,
  opponent,
}: OpponentFormModalProps) {
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactLine, setContactLine] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [homeGround, setHomeGround] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (opponent) {
      setName(opponent.name);
      setArea(opponent.area ?? "");
      setContactName(opponent.contact_name ?? "");
      setContactEmail(opponent.contact_email ?? "");
      setContactLine(opponent.contact_line ?? "");
      setContactPhone(opponent.contact_phone ?? "");
      setHomeGround(opponent.home_ground ?? "");
      setNote(opponent.note ?? "");
    } else {
      setName("");
      setArea("");
      setContactName("");
      setContactEmail("");
      setContactLine("");
      setContactPhone("");
      setHomeGround("");
      setNote("");
    }
    setError(null);
  }, [opponent]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("チーム名を入力してください");
      return;
    }
    setSubmitting(true);
    setError(null);

    const body = {
      name: name.trim(),
      area: area.trim() || null,
      contact_name: contactName.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_line: contactLine.trim() || null,
      contact_phone: contactPhone.trim() || null,
      home_ground: homeGround.trim() || null,
      note: note.trim() || null,
    };

    try {
      const url = opponent
        ? `/api/opponents/${opponent.id}`
        : `/api/teams/${teamId}/opponents`;
      const method = opponent ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onSuccess();
        onDismiss();
        return;
      }
      const err = await res.json();
      setError(err.message ?? err.error ?? "保存に失敗しました");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      header={opponent ? "対戦相手を編集" : "対戦相手を追加"}
      size="medium"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss}>
              キャンセル
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={submitting}
              disabled={!name.trim()}
            >
              {opponent ? "保存" : "追加"}
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

        <FormField label="チーム名" constraintText="必須">
          <Input
            value={name}
            onChange={({ detail }) => setName(detail.value)}
            placeholder="例: レッドソックス"
          />
        </FormField>

        <FormField label="エリア">
          <Input
            value={area}
            onChange={({ detail }) => setArea(detail.value)}
            placeholder="例: 東京都世田谷区"
          />
        </FormField>

        <FormField label="連絡先氏名">
          <Input
            value={contactName}
            onChange={({ detail }) => setContactName(detail.value)}
            placeholder="例: 佐藤次郎"
          />
        </FormField>

        <FormField label="連絡先メール">
          <Input
            value={contactEmail}
            onChange={({ detail }) => setContactEmail(detail.value)}
            placeholder="例: contact@example.com"
            type="email"
          />
        </FormField>

        <FormField label="連絡先LINE">
          <Input
            value={contactLine}
            onChange={({ detail }) => setContactLine(detail.value)}
            placeholder="LINE ID"
          />
        </FormField>

        <FormField label="連絡先電話">
          <Input
            value={contactPhone}
            onChange={({ detail }) => setContactPhone(detail.value)}
            placeholder="例: 090-1234-5678"
          />
        </FormField>

        <FormField label="ホームグラウンド">
          <Input
            value={homeGround}
            onChange={({ detail }) => setHomeGround(detail.value)}
            placeholder="例: ○○公園グラウンド"
          />
        </FormField>

        <FormField label="メモ">
          <Textarea
            value={note}
            onChange={({ detail }) => setNote(detail.value)}
            rows={3}
            placeholder="備考など"
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}
