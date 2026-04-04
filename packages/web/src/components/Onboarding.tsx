"use client";

import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Link from "@cloudscape-design/components/link";
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
  const [contactEmail, setContactEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState(
    "チームに参加しませんか？以下のリンクから登録できます。",
  );
  const [gameTitle, setGameTitle] = useState("");

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
        submitButton: "完了",
        optional: "任意",
      }}
      onCancel={() => onCancel?.()}
      onSubmit={() => onComplete()}
      activeStepIndex={activeStepIndex}
      onNavigate={({ detail }) => setActiveStepIndex(detail.requestedStepIndex)}
      steps={[
        {
          title: "チーム名・連絡先設定",
          description: "チームの基本情報を設定します",
          content: (
            <Container header={<Header variant="h2">チーム基本情報</Header>}>
              <SpaceBetween size="l">
                <FormField
                  label="チーム名"
                  description="チームの表示名を入力してください"
                  constraintText="2文字以上50文字以内で入力してください"
                >
                  <Input
                    value={teamName}
                    onChange={({ detail }) => setTeamName(detail.value)}
                    placeholder="例：港北サンダース"
                  />
                </FormField>
                <FormField
                  label="連絡先メールアドレス"
                  description="チームの連絡先として使用するメールアドレスを入力してください"
                >
                  <Input
                    value={contactEmail}
                    onChange={({ detail }) => setContactEmail(detail.value)}
                    placeholder="例：team@example.com"
                    type="email"
                  />
                </FormField>
              </SpaceBetween>
            </Container>
          ),
        },
        {
          title: "メンバー登録（LINE連携）",
          description: "チームメンバーを招待します",
          content: (
            <Container header={<Header variant="h2">メンバー招待</Header>}>
              <SpaceBetween size="l">
                <Box variant="p">
                  招待リンクを作成してLINEグループに共有すると、メンバーが簡単にチームに参加できます。
                </Box>
                <FormField
                  label="招待メッセージ"
                  description="招待リンクと一緒に送信するメッセージを入力してください"
                >
                  <Input
                    value={inviteMessage}
                    onChange={({ detail }) => setInviteMessage(detail.value)}
                  />
                </FormField>
                <Box variant="p" color="text-body-secondary">
                  ヒント：メンバー登録は後からでも行えます。まずはチームの設定を完了しましょう。
                  詳しい手順は{" "}
                  <Link href="/help/manager" external>
                    管理者ガイド
                  </Link>{" "}
                  をご覧ください。
                </Box>
              </SpaceBetween>
            </Container>
          ),
          isOptional: true,
        },
        {
          title: "初回試合作成",
          description: "最初の試合を作成しましょう",
          content: (
            <Container header={<Header variant="h2">初回試合作成</Header>}>
              <SpaceBetween size="l">
                <Box variant="p">
                  最初の試合を作成して、チーム運営を始めましょう。試合を作成すると、メンバーに出欠確認の通知が届きます。
                </Box>
                <FormField
                  label="試合タイトル"
                  description="試合の名前を入力してください"
                >
                  <Input
                    value={gameTitle}
                    onChange={({ detail }) => setGameTitle(detail.value)}
                    placeholder="例：4月練習試合 vs ○○チーム"
                  />
                </FormField>
                <Box variant="p" color="text-body-secondary">
                  ヒント：試合の詳細（日時・場所・対戦相手など）は、作成後に設定できます。ここではタイトルだけで大丈夫です。
                </Box>
              </SpaceBetween>
            </Container>
          ),
          isOptional: true,
        },
      ]}
    />
  );
}
