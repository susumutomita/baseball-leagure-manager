"use client";

import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";

export default function ManagerGuidePage() {
  return (
    <Box padding="xl">
      <SpaceBetween size="xl">
        <Header
          variant="h1"
          description="チーム管理者向けの操作ガイドです"
          actions={<Link href="/help">ヘルプセンターに戻る</Link>}
        >
          監督・チーム管理者ガイド
        </Header>

        {/* Step 1 */}
        <Container
          header={
            <Header variant="h2" description="まずはチームを登録しましょう">
              1. チーム登録・初期設定
            </Header>
          }
        >
          <SpaceBetween size="s">
            <Box variant="p">
              ログイン後、最初にチームの基本情報を設定します。
            </Box>
            <ol>
              <li>LINEアカウントでログインします</li>
              <li>チーム名を入力します（例：「港北サンダース」）</li>
              <li>連絡先メールアドレスを設定します</li>
              <li>チームのホームグラウンドがあれば登録します</li>
            </ol>
            <Box variant="p" color="text-body-secondary">
              ヒント：チーム名は後から設定画面で変更できます。
            </Box>
          </SpaceBetween>
        </Container>

        {/* Step 2 */}
        <Container
          header={
            <Header variant="h2" description="メンバーをチームに招待しましょう">
              2. メンバー招待（LINE連携）
            </Header>
          }
        >
          <SpaceBetween size="s">
            <Box variant="p">
              LINEを使ってチームメンバーを簡単に招待できます。
            </Box>
            <ol>
              <li>チーム管理画面の「メンバー」メニューを開きます</li>
              <li>「招待リンクを作成」ボタンをクリックします</li>
              <li>生成された招待リンクをLINEグループに共有します</li>
              <li>
                メンバーがリンクを開くと、LINE認証を経て自動的にチームに参加します
              </li>
            </ol>
            <Box variant="p" color="text-body-secondary">
              ヒント：助っ人は「助っ人」メニューから別途管理できます。試合ごとに招待する助っ人を選択できます。
            </Box>
          </SpaceBetween>
        </Container>

        {/* Step 3 */}
        <Container
          header={
            <Header
              variant="h2"
              description="試合を作成し、メンバーの出欠を集めましょう"
            >
              3. 試合の作成と出欠収集
            </Header>
          }
        >
          <SpaceBetween size="s">
            <Box variant="p">
              試合を作成すると、メンバーに自動で出欠確認の通知が届きます。
            </Box>
            <ol>
              <li>
                「試合作成」ボタンをクリックし、試合種別（練習・練習試合・リーグ戦・トーナメント）を選択します
              </li>
              <li>日時・場所などの基本情報を入力します</li>
              <li>
                試合を作成すると、ステータスが「出欠収集中」になり、メンバーにLINEで通知が届きます
              </li>
              <li>
                メンバーがLINEから出欠を回答すると、リアルタイムでダッシュボードに反映されます
              </li>
            </ol>
            <Box variant="p" color="text-body-secondary">
              ヒント：回答期限を設定すると、未回答のメンバーにリマインダーが届きます。
            </Box>
          </SpaceBetween>
        </Container>

        {/* Step 4 */}
        <Container
          header={
            <Header
              variant="h2"
              description="グラウンドの空き状況を自動で監視できます"
            >
              4. グラウンド予約と監視設定
            </Header>
          }
        >
          <SpaceBetween size="s">
            <Box variant="p">
              グラウンド監視機能を使うと、予約サイトの空き状況を定期的にチェックし、空きが出た際に通知を受け取れます。
            </Box>
            <ol>
              <li>「グラウンド」メニューから利用するグラウンドを登録します</li>
              <li>
                監視対象のグラウンドで「監視設定」を有効にし、希望の日時条件を設定します
              </li>
              <li>空きが検出されると、LINEで通知が届きます</li>
              <li>通知から直接予約サイトにアクセスして予約できます</li>
            </ol>
            <Box variant="p" color="text-body-secondary">
              ヒント：人気のグラウンドはすぐに埋まるため、通知を受け取ったら早めに予約しましょう。
            </Box>
          </SpaceBetween>
        </Container>

        {/* Step 5 */}
        <Container
          header={
            <Header variant="h2" description="対戦相手を見つけて交渉しましょう">
              5. 対戦相手の交渉
            </Header>
          }
        >
          <SpaceBetween size="s">
            <Box variant="p">
              対戦相手チームの登録と、試合の交渉ができます。
            </Box>
            <ol>
              <li>
                「対戦相手」メニューから、過去に対戦したチームや新しいチームを登録します
              </li>
              <li>
                試合を作成する際に、対戦相手候補を選択してマッチングリクエストを送信します
              </li>
              <li>
                AIが日程・場所の候補を提案し、双方の条件が合う組み合わせを見つけます
              </li>
              <li>相手チームが承諾すると、試合の対戦相手が確定します</li>
            </ol>
            <Box variant="p" color="text-body-secondary">
              ヒント：AIの提案はあくまで候補です。最終的な決定は必ず管理者が行います。
            </Box>
          </SpaceBetween>
        </Container>

        {/* Step 6 */}
        <Container
          header={
            <Header
              variant="h2"
              description="すべての条件が揃ったら試合を確定しましょう"
            >
              6. 試合確定と通知
            </Header>
          }
        >
          <SpaceBetween size="s">
            <Box variant="p">
              人数・グラウンド・対戦相手が揃うと、試合を確定できます。
            </Box>
            <ol>
              <li>試合詳細画面で、成立条件の充足状況を確認します</li>
              <li>
                すべての条件を満たしている場合、「試合確定」ボタンが有効になります
              </li>
              <li>
                「試合確定」をクリックすると、参加メンバー全員にLINEで確定通知が届きます
              </li>
              <li>確定通知には、日時・場所・集合時間などの詳細が含まれます</li>
            </ol>
            <Box variant="p" color="text-body-secondary">
              ヒント：試合確定は管理者のみが行えます。AIが自動で確定することはありません。
            </Box>
          </SpaceBetween>
        </Container>

        {/* Step 7 */}
        <Container
          header={
            <Header
              variant="h2"
              description="試合結果を記録してチームの成績を管理しましょう"
            >
              7. 試合結果の記録
            </Header>
          }
        >
          <SpaceBetween size="s">
            <Box variant="p">
              試合終了後に結果を記録すると、チームや個人の成績として蓄積されます。
            </Box>
            <ol>
              <li>試合詳細画面で「結果を記録」をクリックします</li>
              <li>スコア（得点）を入力します</li>
              <li>
                必要に応じて個人成績（打席結果・投球内容など）を入力します
              </li>
              <li>記録が完了すると、試合のステータスが「完了」に変わります</li>
            </ol>
            <Box variant="p" color="text-body-secondary">
              ヒント：成績・統計メニューから、チーム全体や個人の成績推移を確認できます。
            </Box>
          </SpaceBetween>
        </Container>

        {/* Step 8 */}
        <Container
          header={
            <Header variant="h2" description="費用を参加者で精算しましょう">
              8. 精算とPayPay連携
            </Header>
          }
        >
          <SpaceBetween size="s">
            <Box variant="p">
              グラウンド代やボール代などの費用を、参加者で公平に割り勘できます。
            </Box>
            <ol>
              <li>
                試合詳細画面の「精算」タブから、費用項目と金額を入力します
              </li>
              <li>参加者数に応じて自動で一人あたりの金額が計算されます</li>
              <li>
                PayPay連携を設定すると、各メンバーに送金リンク付きの精算通知がLINEで届きます
              </li>
              <li>
                全員の精算が完了すると、試合のステータスが「精算済み」に変わります
              </li>
            </ol>
            <Box variant="p" color="text-body-secondary">
              ヒント：PayPay連携は設定画面から行えます。連携しない場合は、金額の通知のみが送信されます。
            </Box>
          </SpaceBetween>
        </Container>
      </SpaceBetween>
    </Box>
  );
}
