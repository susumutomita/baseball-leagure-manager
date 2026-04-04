"use client";

import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";

export default function MemberGuidePage() {
  return (
    <Box padding="xl">
      <SpaceBetween size="xl">
        <Header
          variant="h1"
          description="チームメンバー向けの操作ガイドです"
          actions={<Link href="/help">ヘルプセンターに戻る</Link>}
        >
          メンバーガイド
        </Header>

        {/* Step 1 */}
        <Container
          header={
            <Header variant="h2" description="LINEを使って簡単に登録できます">
              1. LINEでの登録方法
            </Header>
          }
        >
          <SpaceBetween size="s">
            <Box variant="p">
              チーム管理者から届く招待リンクを使って、LINEで簡単に登録できます。
            </Box>
            <ol>
              <li>
                チーム管理者からLINEグループまたは個別メッセージで招待リンクが届きます
              </li>
              <li>リンクをタップすると、LINEの認証画面が表示されます</li>
              <li>「許可する」をタップしてLINE連携を承認します</li>
              <li>
                表示名の確認画面が出るので、チーム内で呼ばれている名前を入力します
              </li>
              <li>登録完了です。以降、試合の通知がLINEで届きます</li>
            </ol>
            <Box variant="p" color="text-body-secondary">
              ヒント：LINEの通知をオフにしている場合、試合の通知が届かないことがあります。通知設定をご確認ください。
            </Box>
          </SpaceBetween>
        </Container>

        {/* Step 2 */}
        <Container
          header={
            <Header variant="h2" description="LINEから簡単に出欠を回答できます">
              2. 出欠の回答方法
            </Header>
          }
        >
          <SpaceBetween size="s">
            <Box variant="p">
              試合が作成されると、LINEで出欠確認の通知が届きます。
            </Box>
            <ol>
              <li>
                LINEに届く出欠確認メッセージの「回答する」ボタンをタップします
              </li>
              <li>「参加」「不参加」「未定」のいずれかを選択します</li>
              <li>
                必要に応じてコメント（遅刻する場合の到着予定時刻など）を入力できます
              </li>
              <li>回答内容はいつでも変更できます</li>
            </ol>
            <Box variant="p" color="text-body-secondary">
              ヒント：回答期限が設定されている場合、期限前にリマインダーが届きます。早めの回答にご協力ください。
            </Box>
          </SpaceBetween>
        </Container>

        {/* Step 3 */}
        <Container
          header={
            <Header variant="h2" description="試合の詳細情報を確認しましょう">
              3. 試合情報の確認
            </Header>
          }
        >
          <SpaceBetween size="s">
            <Box variant="p">
              試合が確定すると、詳細情報がLINEで通知されます。
            </Box>
            <ol>
              <li>
                LINEの確定通知メッセージに、日時・場所・集合時間が記載されています
              </li>
              <li>
                「詳細を見る」リンクをタップすると、アプリで試合の全情報を確認できます
              </li>
              <li>
                試合詳細画面では、参加メンバー一覧やグラウンドへのアクセス情報を確認できます
              </li>
              <li>試合情報に変更があった場合は、LINEで変更通知が届きます</li>
            </ol>
            <Box variant="p" color="text-body-secondary">
              ヒント：グラウンドの場所がわからない場合は、試合詳細画面の地図リンクをご利用ください。
            </Box>
          </SpaceBetween>
        </Container>

        {/* Step 4 */}
        <Container
          header={
            <Header variant="h2" description="自分の成績を振り返りましょう">
              4. 個人成績の見方
            </Header>
          }
        >
          <SpaceBetween size="s">
            <Box variant="p">
              試合結果が記録されると、個人の成績として蓄積されます。
            </Box>
            <ol>
              <li>
                LINEの通知から「成績を見る」をタップするか、アプリの成績ページにアクセスします
              </li>
              <li>打率・出塁率・打点などの打撃成績を確認できます</li>
              <li>投手の場合は防御率・勝敗・奪三振数なども表示されます</li>
              <li>シーズンごとの成績推移やチーム内ランキングも確認できます</li>
            </ol>
            <Box variant="p" color="text-body-secondary">
              ヒント：成績データは管理者が試合結果を記録した後に反映されます。
            </Box>
          </SpaceBetween>
        </Container>
      </SpaceBetween>
    </Box>
  );
}
