"use client";

import Box from "@cloudscape-design/components/box";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Button from "@cloudscape-design/components/button";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Flashbar, {
  type FlashbarProps,
} from "@cloudscape-design/components/flashbar";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import Multiselect, {
  type MultiselectProps,
} from "@cloudscape-design/components/multiselect";
import Select, { type SelectProps } from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Toggle from "@cloudscape-design/components/toggle";
import TokenGroup from "@cloudscape-design/components/token-group";
import type {
  DayOfWeek,
  NegotiationPolicy,
  TimeSlot,
} from "@match-engine/core";
import { DAY_OF_WEEK, TIME_SLOT } from "@match-engine/core";
import { useCallback, useEffect, useState } from "react";

const TEAM_ID = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID ?? "";

const DAY_OPTIONS: MultiselectProps.Option[] = [
  { label: "月曜", value: "MONDAY" },
  { label: "火曜", value: "TUESDAY" },
  { label: "水曜", value: "WEDNESDAY" },
  { label: "木曜", value: "THURSDAY" },
  { label: "金曜", value: "FRIDAY" },
  { label: "土曜", value: "SATURDAY" },
  { label: "日曜", value: "SUNDAY" },
];

const TIME_SLOT_OPTIONS: MultiselectProps.Option[] = [
  { label: "午前", value: "MORNING" },
  { label: "午後", value: "AFTERNOON" },
  { label: "夜間", value: "EVENING" },
];

const COST_SPLIT_OPTIONS: SelectProps.Option[] = [
  { label: "折半", value: "HALF" },
  { label: "ホーム負担", value: "HOME_PAYS" },
  { label: "ビジター負担", value: "VISITOR_PAYS" },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);

  // Team profile state
  const [teamName, setTeamName] = useState("");
  const [homeArea, setHomeArea] = useState("");
  const [activityDay, setActivityDay] = useState("");
  const [inviteLink, setInviteLink] = useState("");

  // Policy state
  const [autoAccept, setAutoAccept] = useState(false);
  const [preferredDays, setPreferredDays] = useState<MultiselectProps.Option[]>(
    [],
  );
  const [preferredTimeSlots, setPreferredTimeSlots] = useState<
    MultiselectProps.Option[]
  >([]);
  const [maxTravelMinutes, setMaxTravelMinutes] = useState("60");
  const [costSplit, setCostSplit] = useState<SelectProps.Option | null>(
    COST_SPLIT_OPTIONS[0],
  );
  const [minNoticeDays, setMinNoticeDays] = useState("7");
  const [blackoutDates, setBlackoutDates] = useState<string[]>([]);
  const [newBlackoutDate, setNewBlackoutDate] = useState("");

  const applyPolicy = useCallback((policy: NegotiationPolicy) => {
    setAutoAccept(policy.auto_accept);
    setPreferredDays(
      policy.preferred_days.map((d) => ({
        label: DAY_OPTIONS.find((o) => o.value === d)?.label ?? d,
        value: d,
      })),
    );
    setPreferredTimeSlots(
      policy.preferred_time_slots.map((t) => ({
        label: TIME_SLOT_OPTIONS.find((o) => o.value === t)?.label ?? t,
        value: t,
      })),
    );
    setMaxTravelMinutes(String(policy.max_travel_minutes));
    setCostSplit(
      COST_SPLIT_OPTIONS.find((o) => o.value === policy.cost_split) ??
        COST_SPLIT_OPTIONS[0],
    );
    setMinNoticeDays(String(policy.min_notice_days));
    setBlackoutDates(policy.blackout_dates);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [policyRes, teamsRes] = await Promise.all([
          fetch(`/api/teams/${TEAM_ID}/policy`),
          fetch("/api/teams"),
        ]);

        const policyJson = await policyRes.json();
        if (policyJson.data) {
          applyPolicy(policyJson.data as NegotiationPolicy);
        }

        const teamsJson = await teamsRes.json();
        const team = (teamsJson.data ?? []).find(
          (t: { id: string }) => t.id === TEAM_ID,
        );
        if (team) {
          setTeamName(team.name ?? "");
          setHomeArea(team.home_area ?? "");
          setActivityDay(team.activity_day ?? "");
        }
      } catch {
        setFlash([
          {
            type: "error",
            content: "設定の読み込みに失敗しました",
            dismissible: true,
            onDismiss: () => setFlash([]),
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [applyPolicy]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: NegotiationPolicy = {
        auto_accept: autoAccept,
        preferred_days: preferredDays
          .map((o) => o.value)
          .filter((v): v is DayOfWeek => DAY_OF_WEEK.includes(v as DayOfWeek)),
        preferred_time_slots: preferredTimeSlots
          .map((o) => o.value)
          .filter((v): v is TimeSlot => TIME_SLOT.includes(v as TimeSlot)),
        max_travel_minutes: Number(maxTravelMinutes) || 60,
        cost_split:
          (costSplit?.value as NegotiationPolicy["cost_split"]) ?? "HALF",
        min_notice_days: Number(minNoticeDays) || 7,
        blackout_dates: blackoutDates,
        auto_decline_reasons: [],
      };

      const res = await fetch(`/api/teams/${TEAM_ID}/policy`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (res.ok) {
        setFlash([
          {
            type: "success",
            content: "交渉ポリシーを保存しました",
            dismissible: true,
            onDismiss: () => setFlash([]),
          },
        ]);
      } else {
        setFlash([
          {
            type: "error",
            content: json.error?.message ?? "保存に失敗しました",
            dismissible: true,
            onDismiss: () => setFlash([]),
          },
        ]);
      }
    } catch {
      setFlash([
        {
          type: "error",
          content: "保存に失敗しました",
          dismissible: true,
          onDismiss: () => setFlash([]),
        },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const addBlackoutDate = () => {
    if (newBlackoutDate && !blackoutDates.includes(newBlackoutDate)) {
      setBlackoutDates([...blackoutDates, newBlackoutDate]);
      setNewBlackoutDate("");
    }
  };

  const handleSaveTeam = async () => {
    setSavingTeam(true);
    try {
      const res = await fetch(`/api/teams/${TEAM_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName,
          home_area: homeArea,
          activity_day: activityDay || null,
        }),
      });

      if (res.ok) {
        setFlash([
          {
            type: "success",
            content: "チーム情報を保存しました",
            dismissible: true,
            onDismiss: () => setFlash([]),
          },
        ]);
      } else {
        const json = await res.json();
        setFlash([
          {
            type: "error",
            content: json.error?.message ?? "チーム情報の保存に失敗しました",
            dismissible: true,
            onDismiss: () => setFlash([]),
          },
        ]);
      }
    } catch {
      setFlash([
        {
          type: "error",
          content: "チーム情報の保存に失敗しました",
          dismissible: true,
          onDismiss: () => setFlash([]),
        },
      ]);
    } finally {
      setSavingTeam(false);
    }
  };

  const generateInviteLink = () => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID ?? "YOUR_LIFF_ID";
    const link = `https://liff.line.me/${liffId}/register?team_id=${TEAM_ID}`;
    setInviteLink(link);
  };

  if (loading) {
    return (
      <ContentLayout header={<Header variant="h1">設定</Header>}>
        <Container>読み込み中...</Container>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: "ダッシュボード", href: "/dashboard" },
            { text: "設定", href: "/settings" },
          ]}
        />
      }
      header={
        <Header
          variant="h1"
          description="チームの設定と交渉ポリシーを管理します"
        >
          設定
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Flashbar items={flash} />

        {/* Team Profile */}
        <Container header={<Header variant="h2">チーム情報</Header>}>
          <SpaceBetween size="l">
            <ColumnLayout columns={2}>
              <FormField label="チーム名">
                <Input
                  value={teamName}
                  onChange={({ detail }) => setTeamName(detail.value)}
                />
              </FormField>

              <FormField label="活動エリア">
                <Input
                  value={homeArea}
                  onChange={({ detail }) => setHomeArea(detail.value)}
                  placeholder="例: 東京都世田谷区"
                />
              </FormField>

              <FormField label="活動曜日">
                <Input
                  value={activityDay}
                  onChange={({ detail }) => setActivityDay(detail.value)}
                  placeholder="例: 土日"
                />
              </FormField>
            </ColumnLayout>

            <Button
              variant="primary"
              loading={savingTeam}
              onClick={handleSaveTeam}
            >
              チーム情報を保存
            </Button>
          </SpaceBetween>
        </Container>

        {/* API Integration / Team ID */}
        <Container header={<Header variant="h2">API連携情報</Header>}>
          <KeyValuePairs
            items={[
              {
                label: "チームID",
                value: (
                  <SpaceBetween direction="horizontal" size="xs">
                    <Box fontFamily="monospace">{TEAM_ID}</Box>
                    <Button
                      iconName="copy"
                      variant="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(TEAM_ID);
                        setFlash([
                          {
                            type: "success",
                            content: "チームIDをコピーしました",
                            dismissible: true,
                            onDismiss: () => setFlash([]),
                          },
                        ]);
                      }}
                    />
                  </SpaceBetween>
                ),
              },
            ]}
          />
        </Container>

        {/* Member Invitation */}
        <Container
          header={
            <Header
              variant="h2"
              description="LINE経由でメンバーを招待するリンクを生成します"
            >
              メンバー招待
            </Header>
          }
        >
          <SpaceBetween size="m">
            <Button onClick={generateInviteLink}>招待リンクを生成</Button>
            {inviteLink && (
              <SpaceBetween size="xs">
                <Box variant="awsui-key-label">招待リンク</Box>
                <SpaceBetween direction="horizontal" size="xs">
                  <Input value={inviteLink} readOnly />
                  <Button
                    iconName="copy"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      setFlash([
                        {
                          type: "success",
                          content: "招待リンクをコピーしました",
                          dismissible: true,
                          onDismiss: () => setFlash([]),
                        },
                      ]);
                    }}
                  >
                    コピー
                  </Button>
                </SpaceBetween>
                <Box variant="small" color="text-body-secondary">
                  このリンクをLINEグループに共有してメンバーを招待してください
                </Box>
              </SpaceBetween>
            )}
          </SpaceBetween>
        </Container>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <Form
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="primary" loading={saving} formAction="submit">
                  保存
                </Button>
              </SpaceBetween>
            }
          >
            <Container header={<Header variant="h2">交渉ポリシー</Header>}>
              <SpaceBetween size="l">
                <FormField
                  label="自動承諾"
                  description="ポリシーに合致する提案を自動的に承諾します"
                >
                  <Toggle
                    checked={autoAccept}
                    onChange={({ detail }) => setAutoAccept(detail.checked)}
                  >
                    {autoAccept ? "有効" : "無効"}
                  </Toggle>
                </FormField>

                <FormField label="希望曜日">
                  <Multiselect
                    selectedOptions={preferredDays}
                    onChange={({ detail }) =>
                      setPreferredDays([...detail.selectedOptions])
                    }
                    options={DAY_OPTIONS}
                    placeholder="希望する曜日を選択"
                  />
                </FormField>

                <FormField label="希望時間帯">
                  <Multiselect
                    selectedOptions={preferredTimeSlots}
                    onChange={({ detail }) =>
                      setPreferredTimeSlots([...detail.selectedOptions])
                    }
                    options={TIME_SLOT_OPTIONS}
                    placeholder="希望する時間帯を選択"
                  />
                </FormField>

                <FormField
                  label="最大移動時間 (分)"
                  description="試合会場までの許容移動時間"
                >
                  <Input
                    type="number"
                    value={maxTravelMinutes}
                    onChange={({ detail }) => setMaxTravelMinutes(detail.value)}
                  />
                </FormField>

                <FormField label="費用分担">
                  <Select
                    selectedOption={costSplit}
                    onChange={({ detail }) =>
                      setCostSplit(detail.selectedOption)
                    }
                    options={COST_SPLIT_OPTIONS}
                  />
                </FormField>

                <FormField
                  label="最低通知日数"
                  description="試合日までに必要な最低日数"
                >
                  <Input
                    type="number"
                    value={minNoticeDays}
                    onChange={({ detail }) => setMinNoticeDays(detail.value)}
                  />
                </FormField>

                <FormField
                  label="ブラックアウト日"
                  description="試合不可の日付を追加"
                >
                  <SpaceBetween size="s">
                    <SpaceBetween direction="horizontal" size="xs">
                      <Input
                        value={newBlackoutDate}
                        onChange={({ detail }) =>
                          setNewBlackoutDate(detail.value)
                        }
                        placeholder="YYYY-MM-DD"
                      />
                      <Button onClick={addBlackoutDate}>追加</Button>
                    </SpaceBetween>
                    <TokenGroup
                      items={blackoutDates.map((d) => ({
                        label: d,
                        dismissLabel: `${d} を削除`,
                      }))}
                      onDismiss={({ detail }) => {
                        setBlackoutDates(
                          blackoutDates.filter(
                            (_, i) => i !== detail.itemIndex,
                          ),
                        );
                      }}
                    />
                  </SpaceBetween>
                </FormField>
              </SpaceBetween>
            </Container>
          </Form>
        </form>
      </SpaceBetween>
    </ContentLayout>
  );
}
