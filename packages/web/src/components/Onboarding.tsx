"use client";

import Alert from "@cloudscape-design/components/alert";
import Container from "@cloudscape-design/components/container";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Wizard from "@cloudscape-design/components/wizard";
import { useState } from "react";

interface OnboardingProps {
  onComplete: () => void;
  onCancel?: () => void;
}

export function Onboarding({ onComplete, onCancel }: OnboardingProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [teamName, setTeamName] = useState("");
  const [homeArea, setHomeArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!teamName.trim()) {
      setError("チーム名を入力してください");
      return;
    }
    if (!homeArea.trim()) {
      setError("活動エリアを入力してください");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName.trim(),
          home_area: homeArea.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data?.error?.message ?? "チーム作成に失敗しました");
        return;
      }

      onComplete();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wizard
      i18nStrings={{
        stepNumberLabel: (stepNumber) => `ステップ ${stepNumber}`,
        collapsedStepsLabel: (stepNumber, stepsCount) =>
          `ステップ ${stepNumber}/${stepsCount}`,
        skipToButtonLabel: (step) => `${step.title} にスキップ`,
        navigationAriaLabel: "ステップ",
        cancelButton: "キャンセル",
        previousButton: "戻る",
        nextButton: "次へ",
        submitButton: loading ? "作成中..." : "チームを作成",
        optional: "任意",
      }}
      onCancel={() => onCancel?.()}
      onSubmit={handleSubmit}
      activeStepIndex={activeStepIndex}
      onNavigate={({ detail }) => setActiveStepIndex(detail.requestedStepIndex)}
      steps={[
        {
          title: "チーム作成",
          description: "チームの基本情報を入力してください",
          content: (
            <Container header={<Header variant="h2">チーム情報</Header>}>
              <SpaceBetween size="l">
                {error && <Alert type="error">{error}</Alert>}
                <FormField label="チーム名">
                  <Input
                    value={teamName}
                    onChange={({ detail }) => setTeamName(detail.value)}
                    placeholder="例：港北サンダース"
                  />
                </FormField>
                <FormField label="活動エリア">
                  <Input
                    value={homeArea}
                    onChange={({ detail }) => setHomeArea(detail.value)}
                    placeholder="例：横浜市港北区"
                  />
                </FormField>
              </SpaceBetween>
            </Container>
          ),
        },
      ]}
    />
  );
}
