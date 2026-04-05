"use client";

import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";

export default function AiDocsPage() {
  return (
    <ContentLayout
      defaultPadding
      header={
        <Header
          variant="h1"
          description="mound は AI エージェントをシステムの一級市民として設計しています。代表は Claude Code や Cursor から自然言語で操作でき、将来はチーム同士のエージェントが自動で対戦交渉を行います。"
        >
          AI エージェント
        </Header>
      }
    >
      <SpaceBetween size="l">
        {/* Philosophy */}
        <Container
          header={
            <Header variant="h2">設計哲学: AI は提案する (Planner)</Header>
          }
        >
          <SpaceBetween size="s">
            <Box variant="p">
              <strong>
                AI は提案する。システムは状態を持つ。人が最後に決める。
              </strong>
            </Box>
            <Box variant="p">
              mound の AI は自律的に判断や実行を行いません。あくまで「提案者
              (Planner)」として振る舞います。
            </Box>
            <Box variant="p">
              <strong>AI が行うこと:</strong>{" "}
              出欠予測、助っ人の推薦、交渉メッセージの生成、次のアクションの提案
            </Box>
            <Box variant="p">
              <strong>AI が行わないこと:</strong>{" "}
              試合の確定、精算の実行、メンバーの除外など不可逆な操作
            </Box>
            <Box variant="p">
              <strong>Governor (ルールエンジン):</strong>{" "}
              成立条件を満たさない遷移をブロックし、AI の暴走を防止
            </Box>
            <Box variant="p">
              <strong>人間の役割:</strong> 最終的な承認 (CONFIRMED 遷移)
              は必ず人間が行う
            </Box>
            <Box variant="p">
              全ての API レスポンスには{" "}
              <Box variant="code" display="inline">
                next_actions
              </Box>{" "}
              フィールドが含まれ、AI
              エージェントが「次に何をすべきか」を自律的に判断できる構造になっています。
            </Box>
          </SpaceBetween>
        </Container>

        {/* AI Features */}
        <Container header={<Header variant="h2">AI 機能</Header>}>
          <SpaceBetween size="l">
            <Container header={<Header variant="h3">出欠予測</Header>}>
              <SpaceBetween size="s">
                <Box variant="p">
                  メンバーごとの出席率、曜日・時間帯の傾向、天候予報、過去のドタキャン率を基に、各メンバーの参加確率を予測します。「全員の回答を待たずに人数の見通しが立つ」ため、早期に助っ人打診の判断ができます。
                </Box>
                <Box variant="code">
                  {`POST /api/ai/predict-attendance
{ "game_id": "uuid" }

→ 予測結果:
  田中: 85% (高い出席率 + 土曜午前は参加傾向)
  佐藤: 40% (最近の出席率低下 + 午後の試合は欠席傾向)
  予想参加人数: 11人`}
                </Box>
              </SpaceBetween>
            </Container>

            <Container header={<Header variant="h3">助っ人推薦</Header>}>
              <SpaceBetween size="s">
                <Box variant="p">
                  不足人数に応じて、信頼度スコア・過去の参加実績・ポジション適性・直近の打診状況を考慮して、最適な助っ人候補を推薦します。「誰に声をかければいいか」の判断を支援します。
                </Box>
                <Box variant="code">
                  {`POST /api/ai/recommend-helpers
{ "game_id": "uuid" }

→ 推薦結果:
  1. 山田 (スコア: 0.95) - 信頼度高 + キャッチャー経験
  2. 高橋 (スコア: 0.82) - 内野手 + 最近3回連続参加
  必要人数: 2人`}
                </Box>
              </SpaceBetween>
            </Container>

            <Container
              header={<Header variant="h3">交渉メッセージ生成</Header>}
            >
              <SpaceBetween size="s">
                <Box variant="p">
                  対戦相手チームへの交渉メッセージを AI
                  が生成します。相手チームの情報、候補日、過去の対戦履歴を考慮した丁寧なメッセージを作成します。
                </Box>
                <Box variant="code">
                  {`POST /api/ai/generate-message
{
  "game_id": "uuid",
  "opponent_team_id": "uuid"
}

→ 生成メッセージ:
  "○○チーム ご担当者様

  いつもお世話になっております。△△チームの□□です。
  4月に練習試合をお願いできればと思いご連絡いたしました。
  候補日は以下の通りです:
  - 4/12 (土) 9:00-12:00
  - 4/19 (土) 9:00-12:00
  ご検討のほどよろしくお願いいたします。"`}
                </Box>
              </SpaceBetween>
            </Container>

            <Container header={<Header variant="h3">週次レポート</Header>}>
              <SpaceBetween size="s">
                <Box variant="p">
                  今週の試合予定、出欠状況、未完了タスク、次週の予定をまとめたレポートを自動生成します。代表が毎週の状況を一目で把握できるダイジェストです。
                </Box>
                <Box variant="code">
                  {`POST /api/ai/weekly-report
{ "team_id": "uuid" }

→ レポート:
  ## 今週のサマリー
  - 4/12 vs 横国さん: 出欠回収中 (7/15)
  - 4/14 練習: 確定済み (12人参加)

  ## 要対応
  - 4/12の試合: あと2人必要 → 助っ人打診を推奨
  - 4/19のグラウンド: 未確保 → 八部公園に空きあり`}
                </Box>
              </SpaceBetween>
            </Container>
          </SpaceBetween>
        </Container>

        {/* MCP Server */}
        <Container header={<Header variant="h2">MCP サーバー連携</Header>}>
          <SpaceBetween size="s">
            <Box variant="p">
              mound は <strong>Model Context Protocol (MCP)</strong>{" "}
              サーバーを提供しています。Claude Desktop、Cursor、Claude Code
              などの AI ツールから、mound
              のすべての機能をネイティブなツールとして利用できます。
            </Box>
            <Box variant="p">
              代表は「試合を組んで」と言うだけで、エージェントが MCP
              ツールを呼び出して試合作成から出欠収集まで自動で進めます。
            </Box>

            <Box variant="h3">セットアップ</Box>
            <Box variant="p">
              Claude Desktop または Cursor の MCP
              設定ファイルに以下を追加してください。
            </Box>
            <Box variant="code">
              {`// claude_desktop_config.json または .cursor/mcp.json
{
  "mcpServers": {
    "mound": {
      "command": "bun",
      "args": ["run", "/path/to/mound/packages/mcp/src/index.ts"],
      "env": {
        "MOUND_API_BASE_URL": "http://localhost:3000",
        "MOUND_API_KEY": "<your-api-key>"
      }
    }
  }
}`}
            </Box>

            <Box variant="h3">利用例</Box>
            <Box variant="code">
              {`# Claude Desktop / Cursor での操作例

ユーザー: "来週の土曜に練習試合を組みたい"

AI エージェント:
  1. create_game → DRAFT で試合作成
  2. transition_game → COLLECTING に遷移
  3. request_rsvps → 全メンバーに出欠依頼送信
  4. "試合を作成し、メンバーに出欠確認を送信しました"

ユーザー: "出欠状況を教えて"

AI エージェント:
  1. get_rsvps → 出欠一覧取得
  2. "参加7人、不参加3人、未回答5人です。
      あと2人必要です。助っ人に声をかけますか？"

ユーザー: "おすすめの助っ人に依頼して"

AI エージェント:
  1. recommend_helpers → AI が推薦
  2. create_helper_requests → 上位2名に打診
  3. "山田さんと高橋さんに依頼を送りました"`}
            </Box>
          </SpaceBetween>
        </Container>

        {/* MCP Tools */}
        <Container header={<Header variant="h2">MCP ツール一覧</Header>}>
          <SpaceBetween size="s">
            <Box variant="p">
              エージェントが呼び出せる全ツールです。試合成立ループに必要な操作を網羅しています。
            </Box>

            <Box variant="h3">試合ライフサイクル (5 ツール)</Box>
            <Table
              columnDefinitions={[
                {
                  id: "tool",
                  header: "ツール名",
                  cell: (item) => <Box variant="code">{item.tool}</Box>,
                },
                { id: "desc", header: "説明", cell: (item) => item.desc },
              ]}
              items={[
                {
                  tool: "create_game",
                  desc: "試合を新規作成する。DRAFT 状態で作成される",
                },
                {
                  tool: "get_game",
                  desc: "試合の詳細を取得する。ステータス・出欠集計・次のアクション候補を含む",
                },
                { tool: "list_games", desc: "チームの試合一覧を取得する" },
                {
                  tool: "transition_game",
                  desc: "試合のステータスを遷移させる。CONFIRMED への遷移はガバナー条件が必要",
                },
                {
                  tool: "validate_game",
                  desc: "試合が確定条件を満たしているか検証する",
                },
              ]}
              variant="embedded"
            />

            <Box variant="h3">出欠管理 (3 ツール)</Box>
            <Table
              columnDefinitions={[
                {
                  id: "tool",
                  header: "ツール名",
                  cell: (item) => <Box variant="code">{item.tool}</Box>,
                },
                { id: "desc", header: "説明", cell: (item) => item.desc },
              ]}
              items={[
                {
                  tool: "request_rsvps",
                  desc: "全メンバーに出欠確認を送信する",
                },
                { tool: "get_rsvps", desc: "出欠回答一覧と集計を取得する" },
                {
                  tool: "respond_rsvp",
                  desc: "出欠回答を登録する (AVAILABLE / UNAVAILABLE / MAYBE)",
                },
              ]}
              variant="embedded"
            />

            <Box variant="h3">助っ人管理 (2 ツール)</Box>
            <Table
              columnDefinitions={[
                {
                  id: "tool",
                  header: "ツール名",
                  cell: (item) => <Box variant="code">{item.tool}</Box>,
                },
                { id: "desc", header: "説明", cell: (item) => item.desc },
              ]}
              items={[
                {
                  tool: "list_helpers",
                  desc: "チームに登録されている助っ人一覧を取得する",
                },
                {
                  tool: "create_helper_requests",
                  desc: "助っ人に参加依頼を一括送信する",
                },
              ]}
              variant="embedded"
            />

            <Box variant="h3">対戦交渉 (3 ツール)</Box>
            <Table
              columnDefinitions={[
                {
                  id: "tool",
                  header: "ツール名",
                  cell: (item) => <Box variant="code">{item.tool}</Box>,
                },
                { id: "desc", header: "説明", cell: (item) => item.desc },
              ]}
              items={[
                {
                  tool: "create_negotiation",
                  desc: "相手チームとの対戦交渉を開始する",
                },
                {
                  tool: "update_negotiation",
                  desc: "交渉ステータスを更新する",
                },
                {
                  tool: "list_negotiations",
                  desc: "試合に関連する交渉一覧を取得する",
                },
              ]}
              variant="embedded"
            />

            <Box variant="h3">精算 (3 ツール)</Box>
            <Table
              columnDefinitions={[
                {
                  id: "tool",
                  header: "ツール名",
                  cell: (item) => <Box variant="code">{item.tool}</Box>,
                },
                { id: "desc", header: "説明", cell: (item) => item.desc },
              ]}
              items={[
                { tool: "add_expense", desc: "試合の費用を登録する" },
                {
                  tool: "calculate_settlement",
                  desc: "精算を計算する (参加者ごとの支払い額を算出)",
                },
                { tool: "list_expenses", desc: "登録済み費用一覧を取得する" },
              ]}
              variant="embedded"
            />
          </SpaceBetween>
        </Container>

        {/* Agent-to-Agent */}
        <Container
          header={<Header variant="h2">エージェント間交渉 (将来構想)</Header>}
        >
          <SpaceBetween size="s">
            <Box variant="p">
              将来的に、チームAのエージェントとチームBのエージェントが自動で対戦交渉を行う仕組みを実現します。
            </Box>

            <Box variant="code">
              {`現在 (Phase 1):
  代表 → Claude Code → MCP → システム → DB

Phase 4 (半自動交渉):
  代表 → Claude Code → MCP → システム → 相手チームのMCP → 相手のエージェント

Phase 5 (完全自動交渉):
  エージェントA → MCP → システム → MCP → エージェントB
  (人間は承認のみ)`}
            </Box>

            <Box variant="h3">交渉ポリシー</Box>
            <Box variant="p">
              各チームが交渉ポリシーを設定し、エージェントがポリシーに基づいて自動判断します。
            </Box>
            <Box variant="code">
              {`{
  "auto_accept": true,
  "preferred_days": ["SATURDAY", "SUNDAY"],
  "preferred_time_slots": ["MORNING"],
  "max_travel_minutes": 30,
  "cost_split": "HALF",
  "min_notice_days": 14,
  "blackout_dates": ["2026-05-03", "2026-05-04", "2026-05-05"],
  "auto_decline_reasons": ["HOLIDAY", "CONSECUTIVE"]
}`}
            </Box>

            <Box variant="h3">自動交渉フロー</Box>
            <Box variant="code">
              {`1. チームA エージェント: list_available_opponents
   → ポリシーがマッチするチーム一覧を取得

2. チームA エージェント: propose_match
   → チームBに「4/12 9:00-12:00 八部公園」を提案

3. システム: チームBのポリシーと照合
   - preferred_days に SATURDAY を含む ... OK
   - preferred_time_slots に MORNING を含む ... OK
   - max_travel_minutes: 八部公園はチームBから20分 ... OK
   - min_notice_days: 14日以上先 ... OK
   → 自動承諾

4. チームA エージェント: 承諾通知を受信 → confirm_match で確定

5. チームB エージェント: 確定通知を受信 → 自チームの出欠収集を開始`}
            </Box>
          </SpaceBetween>
        </Container>

        {/* Roadmap */}
        <Container header={<Header variant="h2">ロードマップ</Header>}>
          <Table
            columnDefinitions={[
              {
                id: "phase",
                header: "Phase",
                cell: (item) =>
                  item.current ? <strong>{item.phase}</strong> : item.phase,
              },
              { id: "desc", header: "内容", cell: (item) => item.desc },
            ]}
            items={[
              {
                phase: "Phase 1 (現在)",
                desc: "代表が Claude Code で手動操作。MCP ツール経由で試合管理",
                current: true,
              },
              {
                phase: "Phase 2",
                desc: "代表が交渉ポリシーを設定。システムが候補チームを提示",
                current: false,
              },
              {
                phase: "Phase 3",
                desc: "相手チームに招待リンク送付。相手もシステムに登録",
                current: false,
              },
              {
                phase: "Phase 4",
                desc: "半自動交渉。ポリシーマッチ → 提案自動生成 → 人間承認",
                current: false,
              },
              {
                phase: "Phase 5",
                desc: "完全自動交渉。auto_accept=true のチーム同士は即成立",
                current: false,
              },
            ]}
            variant="embedded"
          />
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}
