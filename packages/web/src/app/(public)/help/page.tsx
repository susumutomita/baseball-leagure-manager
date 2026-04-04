"use client";

import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import ExpandableSection from "@cloudscape-design/components/expandable-section";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";

export default function HelpPage() {
  return (
    <Box padding="xl">
      <SpaceBetween size="xl">
        <Header
          variant="h1"
          description="試合成立エンジンの使い方をご案内します"
        >
          ヘルプセンター
        </Header>

        {/* クイックスタートガイド */}
        <Container header={<Header variant="h2">ガイド</Header>}>
          <SpaceBetween size="m">
            <Box>
              <Link href="/help/manager" fontSize="heading-m">
                監督・チーム管理者ガイド
              </Link>
              <Box variant="p" color="text-body-secondary">
                チーム登録からメンバー招待、試合作成、精算までの一連の流れを解説します。
              </Box>
            </Box>
            <Box>
              <Link href="/help/member" fontSize="heading-m">
                メンバーガイド
              </Link>
              <Box variant="p" color="text-body-secondary">
                LINEでの登録方法、出欠の回答、試合情報の確認方法を解説します。
              </Box>
            </Box>
          </SpaceBetween>
        </Container>

        {/* よくある質問 */}
        <Container header={<Header variant="h2">よくある質問</Header>}>
          <SpaceBetween size="s">
            <ExpandableSection headerText="試合成立エンジンとは何ですか？">
              <Box variant="p">
                草野球チーム向けの試合運営支援サービスです。出欠管理、グラウンド予約の監視、対戦相手とのマッチング、試合後の精算まで、試合を成立させるために必要な作業をまとめて管理できます。
              </Box>
            </ExpandableSection>

            <ExpandableSection headerText="利用料金はかかりますか？">
              <Box variant="p">
                現在はベータ版として無料でご利用いただけます。正式リリース時の料金体系については別途ご案内いたします。
              </Box>
            </ExpandableSection>

            <ExpandableSection headerText="LINEアカウントは必須ですか？">
              <Box variant="p">
                はい。メンバーへの通知や出欠収集にLINEを使用するため、LINEアカウントが必要です。チーム管理者がLINE公式アカウントを連携し、メンバーはLINEから出欠を回答します。
              </Box>
            </ExpandableSection>

            <ExpandableSection headerText="何人から利用できますか？">
              <Box variant="p">
                チーム登録は1名から可能です。試合の成立には野球のルール上9名以上が必要ですが、練習であれば人数制限はありません。
              </Box>
            </ExpandableSection>

            <ExpandableSection headerText="助っ人の管理はできますか？">
              <Box variant="p">
                はい。チームメンバーとは別に助っ人を登録できます。試合ごとに助っ人を招待し、出欠を管理できます。
              </Box>
            </ExpandableSection>

            <ExpandableSection headerText="グラウンド監視とは何ですか？">
              <Box variant="p">
                自治体のグラウンド予約サイトを定期的にチェックし、空きが出た場合に通知する機能です。人気のグラウンドの予約を取りやすくなります。
              </Box>
            </ExpandableSection>

            <ExpandableSection headerText="精算はどのように行いますか？">
              <Box variant="p">
                試合終了後、グラウンド代やボール代などの費用を参加者で割り勘計算します。PayPayとの連携により、送金リンクを生成して精算を簡単に行えます。
              </Box>
            </ExpandableSection>

            <ExpandableSection headerText="データのバックアップはありますか？">
              <Box variant="p">
                データはクラウド上に安全に保存されています。試合結果や成績データは常にバックアップされており、いつでも確認可能です。
              </Box>
            </ExpandableSection>
          </SpaceBetween>
        </Container>

        {/* お問い合わせ */}
        <Container header={<Header variant="h2">お問い合わせ</Header>}>
          <SpaceBetween size="s">
            <Box variant="p">
              ご不明な点やご要望がございましたら、以下の方法でお問い合わせください。
            </Box>
            <Box>
              <Box variant="strong">メール</Box>
              <Box variant="p">support@match-engine.example.com</Box>
            </Box>
            <Box>
              <Box variant="strong">LINE公式アカウント</Box>
              <Box variant="p">
                LINE公式アカウントからもお問い合わせいただけます。アプリ内のチャットからメッセージをお送りください。
              </Box>
            </Box>
            <Box>
              <Box variant="strong">対応時間</Box>
              <Box variant="p">平日 10:00 - 18:00（土日祝を除く）</Box>
            </Box>
          </SpaceBetween>
        </Container>
      </SpaceBetween>
    </Box>
  );
}
