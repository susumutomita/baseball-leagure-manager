"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Modal from "@cloudscape-design/components/modal";
import Multiselect, {
  type MultiselectProps,
} from "@cloudscape-design/components/multiselect";
import Select, { type SelectProps } from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useEffect, useState } from "react";

const TIER_OPTIONS: SelectProps.Option[] = [
  { label: "PRO", value: "PRO" },
  { label: "LITE", value: "LITE" },
];

const ROLE_OPTIONS: SelectProps.Option[] = [
  { label: "管理者(代表)", value: "SUPER_ADMIN" },
  { label: "管理者", value: "ADMIN" },
  { label: "メンバー", value: "MEMBER" },
];

const POSITION_OPTIONS: MultiselectProps.Option[] = [
  { label: "ピッチャー", value: "ピッチャー" },
  { label: "キャッチャー", value: "キャッチャー" },
  { label: "ファースト", value: "ファースト" },
  { label: "セカンド", value: "セカンド" },
  { label: "サード", value: "サード" },
  { label: "ショート", value: "ショート" },
  { label: "レフト", value: "レフト" },
  { label: "センター", value: "センター" },
  { label: "ライト", value: "ライト" },
];

interface Member {
  id: string;
  name: string;
  tier: string;
  role: string;
  email?: string | null;
  positions_json?: string[] | null;
  jersey_number?: number | null;
}

interface MemberFormModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: () => void;
  teamId: string;
  member?: Member | null;
}

export function MemberFormModal({
  visible,
  onDismiss,
  onSuccess,
  teamId,
  member,
}: MemberFormModalProps) {
  const [name, setName] = useState("");
  const [tier, setTier] = useState<SelectProps.Option | null>(
    TIER_OPTIONS[0] ?? null,
  );
  const [role, setRole] = useState<SelectProps.Option | null>(
    ROLE_OPTIONS[2] ?? null,
  );
  const [email, setEmail] = useState("");
  const [positions, setPositions] = useState<MultiselectProps.Option[]>([]);
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setName(member.name);
      setTier(TIER_OPTIONS.find((o) => o.value === member.tier) ?? null);
      setRole(ROLE_OPTIONS.find((o) => o.value === member.role) ?? null);
      setEmail(member.email ?? "");
      setPositions(
        (member.positions_json ?? [])
          .map((p) => POSITION_OPTIONS.find((o) => o.value === p))
          .filter((o): o is MultiselectProps.Option => !!o),
      );
      setJerseyNumber(
        member.jersey_number != null ? String(member.jersey_number) : "",
      );
    } else {
      setName("");
      setTier(TIER_OPTIONS[0] ?? null);
      setRole(ROLE_OPTIONS[2] ?? null);
      setEmail("");
      setPositions([]);
      setJerseyNumber("");
    }
    setError(null);
  }, [member]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("名前を入力してください");
      return;
    }
    setSubmitting(true);
    setError(null);

    const body = {
      name: name.trim(),
      tier: tier?.value ?? "LITE",
      role: role?.value ?? "MEMBER",
      email: email.trim() || null,
      positions_json: positions.map((p) => p.value).filter(Boolean),
      jersey_number: jerseyNumber ? Number(jerseyNumber) : null,
    };

    try {
      const url = member
        ? `/api/members/${member.id}`
        : `/api/teams/${teamId}/members`;
      const method = member ? "PATCH" : "POST";
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
      header={member ? "メンバーを編集" : "メンバーを追加"}
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
              {member ? "保存" : "追加"}
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
            placeholder="例: 山田太郎"
          />
        </FormField>

        <FormField label="区分">
          <Select
            selectedOption={tier}
            onChange={({ detail }) => setTier(detail.selectedOption)}
            options={TIER_OPTIONS}
          />
        </FormField>

        <FormField label="ロール">
          <Select
            selectedOption={role}
            onChange={({ detail }) => setRole(detail.selectedOption)}
            options={ROLE_OPTIONS}
          />
        </FormField>

        <FormField label="メールアドレス">
          <Input
            value={email}
            onChange={({ detail }) => setEmail(detail.value)}
            placeholder="例: taro@example.com"
            type="email"
          />
        </FormField>

        <FormField label="ポジション">
          <Multiselect
            selectedOptions={positions}
            onChange={({ detail }) => setPositions([...detail.selectedOptions])}
            options={POSITION_OPTIONS}
            placeholder="ポジションを選択"
          />
        </FormField>

        <FormField label="背番号">
          <Input
            value={jerseyNumber}
            onChange={({ detail }) => setJerseyNumber(detail.value)}
            placeholder="例: 10"
            type="number"
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}
