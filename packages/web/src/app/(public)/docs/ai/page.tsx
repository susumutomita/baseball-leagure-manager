import type { Metadata } from "next";
import styles from "../docs.module.css";

export const metadata: Metadata = {
  title: "AI エージェント | mound",
  description:
    "mound の AI エージェント機能。MCP サーバー連携、出欠予測、助っ人推薦、メッセージ生成。",
};

export default function AiDocsPage() {
  return (
    <>
      <h1 className={styles.pageTitle}>AI エージェント</h1>
      <p className={styles.pageDescription}>
        mound は AI エージェントをシステムの一級市民として設計しています。代表は
        Claude Code や Cursor
        から自然言語で操作でき、将来はチーム同士のエージェントが自動で対戦交渉を行います。
      </p>

      {/* Philosophy */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          設計哲学: AI は提案する (Planner)
        </h2>
        <div className={styles.info}>
          <strong>
            AI は提案する。システムは状態を持つ。人が最後に決める。
          </strong>
        </div>
        <p className={styles.paragraph}>
          mound の AI は自律的に判断や実行を行いません。あくまで「提案者
          (Planner)」として振る舞います。
        </p>
        <ul className={styles.list}>
          <li>
            <strong>AI が行うこと:</strong>{" "}
            出欠予測、助っ人の推薦、交渉メッセージの生成、次のアクションの提案
          </li>
          <li>
            <strong>AI が行わないこと:</strong>{" "}
            試合の確定、精算の実行、メンバーの除外など不可逆な操作
          </li>
          <li>
            <strong>Governor (ルールエンジン):</strong>{" "}
            成立条件を満たさない遷移をブロックし、AI の暴走を防止
          </li>
          <li>
            <strong>人間の役割:</strong> 最終的な承認 (CONFIRMED 遷移)
            は必ず人間が行う
          </li>
        </ul>
        <p className={styles.paragraph}>
          全ての API レスポンスには{" "}
          <code className={styles.codeInline}>next_actions</code>{" "}
          フィールドが含まれ、AI
          エージェントが「次に何をすべきか」を自律的に判断できる構造になっています。
        </p>
      </div>

      {/* AI Features */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>AI 機能</h2>

        <div className={styles.featureCard}>
          <h3 className={styles.featureCardTitle}>出欠予測</h3>
          <p className={styles.featureCardDesc}>
            メンバーごとの出席率、曜日・時間帯の傾向、天候予報、過去のドタキャン率を基に、各メンバーの参加確率を予測します。「全員の回答を待たずに人数の見通しが立つ」ため、早期に助っ人打診の判断ができます。
          </p>
          <div className={styles.codeBlock}>
            {`POST /api/ai/predict-attendance
{ "game_id": "uuid" }

→ 予測結果:
  田中: 85% (高い出席率 + 土曜午前は参加傾向)
  佐藤: 40% (最近の出席率低下 + 午後の試合は欠席傾向)
  予想参加人数: 11人`}
          </div>
        </div>

        <div className={styles.featureCard}>
          <h3 className={styles.featureCardTitle}>助っ人推薦</h3>
          <p className={styles.featureCardDesc}>
            不足人数に応じて、信頼度スコア・過去の参加実績・ポジション適性・直近の打診状況を考慮して、最適な助っ人候補を推薦します。「誰に声をかければいいか」の判断を支援します。
          </p>
          <div className={styles.codeBlock}>
            {`POST /api/ai/recommend-helpers
{ "game_id": "uuid" }

→ 推薦結果:
  1. 山田 (スコア: 0.95) - 信頼度高 + キャッチャー経験
  2. 高橋 (スコア: 0.82) - 内野手 + 最近3回連続参加
  必要人数: 2人`}
          </div>
        </div>

        <div className={styles.featureCard}>
          <h3 className={styles.featureCardTitle}>交渉メッセージ生成</h3>
          <p className={styles.featureCardDesc}>
            対戦相手チームへの交渉メッセージを AI
            が生成します。相手チームの情報、候補日、過去の対戦履歴を考慮した丁寧なメッセージを作成します。
          </p>
          <div className={styles.codeBlock}>
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
          </div>
        </div>

        <div className={styles.featureCard}>
          <h3 className={styles.featureCardTitle}>週次レポート</h3>
          <p className={styles.featureCardDesc}>
            今週の試合予定、出欠状況、未完了タスク、次週の予定をまとめたレポートを自動生成します。代表が毎週の状況を一目で把握できるダイジェストです。
          </p>
          <div className={styles.codeBlock}>
            {`POST /api/ai/weekly-report
{ "team_id": "uuid" }

→ レポート:
  ## 今週のサマリー
  - 4/12 vs 横国さん: 出欠回収中 (7/15)
  - 4/14 練習: 確定済み (12人参加)

  ## 要対応
  - 4/12の試合: あと2人必要 → 助っ人打診を推奨
  - 4/19のグラウンド: 未確保 → 八部公園に空きあり`}
          </div>
        </div>
      </div>

      {/* MCP Server */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>MCP サーバー連携</h2>
        <p className={styles.paragraph}>
          mound は <strong>Model Context Protocol (MCP)</strong>{" "}
          サーバーを提供しています。Claude Desktop、Cursor、Claude Code などの
          AI ツールから、mound
          のすべての機能をネイティブなツールとして利用できます。
        </p>
        <div className={styles.info}>
          代表は「試合を組んで」と言うだけで、エージェントが MCP
          ツールを呼び出して試合作成から出欠収集まで自動で進めます。
        </div>

        <h3 className={styles.subsectionTitle}>セットアップ</h3>
        <p className={styles.paragraph}>
          Claude Desktop または Cursor の MCP
          設定ファイルに以下を追加してください。
        </p>
        <div className={styles.codeBlock}>
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
        </div>

        <h3 className={styles.subsectionTitle}>利用例</h3>
        <div className={styles.codeBlock}>
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
        </div>
      </div>

      {/* MCP Tools */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>MCP ツール一覧</h2>
        <p className={styles.paragraph}>
          エージェントが呼び出せる全ツールです。試合成立ループに必要な操作を網羅しています。
        </p>

        <h3 className={styles.subsectionTitle}>
          試合ライフサイクル (5 ツール)
        </h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ツール名</th>
              <th>説明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code className={styles.codeInline}>create_game</code>
              </td>
              <td>試合を新規作成する。DRAFT 状態で作成される</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>get_game</code>
              </td>
              <td>
                試合の詳細を取得する。ステータス・出欠集計・次のアクション候補を含む
              </td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>list_games</code>
              </td>
              <td>チームの試合一覧を取得する</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>transition_game</code>
              </td>
              <td>
                試合のステータスを遷移させる。CONFIRMED
                への遷移はガバナー条件が必要
              </td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>validate_game</code>
              </td>
              <td>試合が確定条件を満たしているか検証する</td>
            </tr>
          </tbody>
        </table>

        <h3 className={styles.subsectionTitle}>出欠管理 (3 ツール)</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ツール名</th>
              <th>説明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code className={styles.codeInline}>request_rsvps</code>
              </td>
              <td>全メンバーに出欠確認を送信する</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>get_rsvps</code>
              </td>
              <td>出欠回答一覧と集計を取得する</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>respond_rsvp</code>
              </td>
              <td>出欠回答を登録する (AVAILABLE / UNAVAILABLE / MAYBE)</td>
            </tr>
          </tbody>
        </table>

        <h3 className={styles.subsectionTitle}>助っ人管理 (2 ツール)</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ツール名</th>
              <th>説明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code className={styles.codeInline}>list_helpers</code>
              </td>
              <td>チームに登録されている助っ人一覧を取得する</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>
                  create_helper_requests
                </code>
              </td>
              <td>助っ人に参加依頼を一括送信する</td>
            </tr>
          </tbody>
        </table>

        <h3 className={styles.subsectionTitle}>対戦交渉 (3 ツール)</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ツール名</th>
              <th>説明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code className={styles.codeInline}>create_negotiation</code>
              </td>
              <td>相手チームとの対戦交渉を開始する</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>update_negotiation</code>
              </td>
              <td>交渉ステータスを更新する</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>list_negotiations</code>
              </td>
              <td>試合に関連する交渉一覧を取得する</td>
            </tr>
          </tbody>
        </table>

        <h3 className={styles.subsectionTitle}>精算 (3 ツール)</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ツール名</th>
              <th>説明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code className={styles.codeInline}>add_expense</code>
              </td>
              <td>試合の費用を登録する</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>calculate_settlement</code>
              </td>
              <td>精算を計算する (参加者ごとの支払い額を算出)</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>list_expenses</code>
              </td>
              <td>登録済み費用一覧を取得する</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Agent-to-Agent */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>エージェント間交渉 (将来構想)</h2>
        <p className={styles.paragraph}>
          将来的に、チームAのエージェントとチームBのエージェントが自動で対戦交渉を行う仕組みを実現します。
        </p>

        <div className={styles.codeBlock}>
          {`現在 (Phase 1):
  代表 → Claude Code → MCP → システム → DB

Phase 4 (半自動交渉):
  代表 → Claude Code → MCP → システム → 相手チームのMCP → 相手のエージェント

Phase 5 (完全自動交渉):
  エージェントA → MCP → システム → MCP → エージェントB
  (人間は承認のみ)`}
        </div>

        <h3 className={styles.subsectionTitle}>交渉ポリシー</h3>
        <p className={styles.paragraph}>
          各チームが交渉ポリシーを設定し、エージェントがポリシーに基づいて自動判断します。
        </p>
        <div className={styles.codeBlock}>
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
        </div>

        <h3 className={styles.subsectionTitle}>自動交渉フロー</h3>
        <div className={styles.codeBlock}>
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
        </div>
      </div>

      {/* Roadmap */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>ロードマップ</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Phase</th>
              <th>内容</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Phase 1 (現在)</strong>
              </td>
              <td>代表が Claude Code で手動操作。MCP ツール経由で試合管理</td>
            </tr>
            <tr>
              <td>Phase 2</td>
              <td>代表が交渉ポリシーを設定。システムが候補チームを提示</td>
            </tr>
            <tr>
              <td>Phase 3</td>
              <td>相手チームに招待リンク送付。相手もシステムに登録</td>
            </tr>
            <tr>
              <td>Phase 4</td>
              <td>半自動交渉。ポリシーマッチ → 提案自動生成 → 人間承認</td>
            </tr>
            <tr>
              <td>Phase 5</td>
              <td>完全自動交渉。auto_accept=true のチーム同士は即成立</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
