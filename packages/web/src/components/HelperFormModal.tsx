"use client";

import { useTeam } from "@/contexts/TeamContext";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import { useEffect, useState } from "react";

interface Helper {
  id: string;
  name: string;
  email?: string | null;
  line_user_id?: string | null;
  note?: string | null;
}

interface HelperFormModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: () => void;
  helper?: Helper | null;
}

export function HelperFormModal({
  visible,
  onDismiss,
  onSuccess,
  helper,
}: HelperFormModalProps) {
  const team = useTeam();
  const teamId = team?.teamId;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lineUserId, setLineUserId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (helper) {
      setName(helper.name);
      setEmail(helper.email ?? "");
      setLineUserId(helper.line_user_id ?? "");
      setNote(helper.note ?? "");
    } else {
      setName("");
      setEmail("");
      setLineUserId("");
      setNote("");
    }
    setError(null);
  }, [helper]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("名前を入力してください");
      return;
    }
    setSubmitting(true);
    setError(null);

    const body = {
      name: name.trim(),
      email: email.trim() || null,
      line_user_id: lineUserId.trim() || null,
      note: note.trim() || null,
      ...(helper ? {} : { team_id: teamId }),
    };

    try {
      const url = helper ? `/api/helpers/${helper.id}` : "/api/helpers";
      const method = helper ? "PATCH" : "POST";
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
      header={helper ? "助っ人を編集" : "助っ人を追加"}
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
              {helper ? "保存" : "追加"}
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

        <FormField label="名前" constraintText="必須">
          <Input
            value={name}
            onChange={({ detail }) => setName(detail.value)}
            placeholder="例: 鈴木一郎"
          />
        </FormField>

        <FormField label="メールアドレス">
          <Input
            value={email}
            onChange={({ detail }) => setEmail(detail.value)}
            placeholder="例: ichiro@example.com"
            type="email"
          />
        </FormField>

        <FormField label="LINE ユーザーID">
          <Input
            value={lineUserId}
            onChange={({ detail }) => setLineUserId(detail.value)}
            placeholder="LINE ユーザーID"
          />
        </FormField>

        <FormField label="メモ">
          <Textarea
            value={note}
            onChange={({ detail }) => setNote(detail.value)}
            rows={3}
            placeholder="連絡事項など"
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}
