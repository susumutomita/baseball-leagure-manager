"use client";

import { useTeam } from "@/contexts/TeamContext";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import Toggle from "@cloudscape-design/components/toggle";
import { useEffect, useState } from "react";

interface Ground {
  id: string;
  name: string;
  municipality?: string | null;
  source_url?: string | null;
  cost_per_slot?: number | null;
  is_hardball_ok?: boolean | null;
  has_night_lights?: boolean | null;
  note?: string | null;
}

interface GroundFormModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: () => void;
  ground?: Ground | null;
}

export function GroundFormModal({
  visible,
  onDismiss,
  onSuccess,
  ground,
}: GroundFormModalProps) {
  const team = useTeam();
  const teamId = team?.teamId;

  const [name, setName] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [costPerSlot, setCostPerSlot] = useState("");
  const [isHardballOk, setIsHardballOk] = useState(false);
  const [hasNightLights, setHasNightLights] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ground) {
      setName(ground.name);
      setMunicipality(ground.municipality ?? "");
      setSourceUrl(ground.source_url ?? "");
      setCostPerSlot(
        ground.cost_per_slot != null ? String(ground.cost_per_slot) : "",
      );
      setIsHardballOk(ground.is_hardball_ok ?? false);
      setHasNightLights(ground.has_night_lights ?? false);
      setNote(ground.note ?? "");
    } else {
      setName("");
      setMunicipality("");
      setSourceUrl("");
      setCostPerSlot("");
      setIsHardballOk(false);
      setHasNightLights(false);
      setNote("");
    }
    setError(null);
  }, [ground]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("名前を入力してください");
      return;
    }
    if (!municipality.trim()) {
      setError("自治体を入力してください");
      return;
    }
    setSubmitting(true);
    setError(null);

    const body = {
      name: name.trim(),
      municipality: municipality.trim(),
      source_url: sourceUrl.trim() || null,
      cost_per_slot: costPerSlot ? Number(costPerSlot) : null,
      is_hardball_ok: isHardballOk,
      has_night_lights: hasNightLights,
      note: note.trim() || null,
      ...(ground ? {} : { team_id: teamId }),
    };

    try {
      const url = ground ? `/api/grounds/${ground.id}` : "/api/grounds";
      const method = ground ? "PATCH" : "POST";
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
      header={ground ? "グラウンドを編集" : "グラウンドを追加"}
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
              disabled={!name.trim() || !municipality.trim()}
            >
              {ground ? "保存" : "追加"}
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
            placeholder="例: ○○公園グラウンド"
          />
        </FormField>

        <FormField label="自治体" constraintText="必須">
          <Input
            value={municipality}
            onChange={({ detail }) => setMunicipality(detail.value)}
            placeholder="例: 世田谷区"
          />
        </FormField>

        <FormField label="予約サイトURL">
          <Input
            value={sourceUrl}
            onChange={({ detail }) => setSourceUrl(detail.value)}
            placeholder="https://..."
          />
        </FormField>

        <FormField label="1枠あたりの料金">
          <Input
            value={costPerSlot}
            onChange={({ detail }) => setCostPerSlot(detail.value)}
            placeholder="例: 5000"
            type="number"
          />
        </FormField>

        <FormField label="硬式利用可">
          <Toggle
            checked={isHardballOk}
            onChange={({ detail }) => setIsHardballOk(detail.checked)}
          >
            硬式利用可
          </Toggle>
        </FormField>

        <FormField label="照明設備">
          <Toggle
            checked={hasNightLights}
            onChange={({ detail }) => setHasNightLights(detail.checked)}
          >
            照明あり
          </Toggle>
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
