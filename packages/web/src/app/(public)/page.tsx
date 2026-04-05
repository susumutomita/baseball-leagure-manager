"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const SUGGESTIONS = [
  "4/11 9:00-11:00 練習試合 八部公園",
  "来週の日曜、練習できる？",
  "今月の予定を見せて",
  "助っ人2人探して",
  "先週の試合の精算して",
];

const DEMO_RESPONSES: Record<string, string[]> = {
  "4/11 9:00-11:00 練習試合 八部公園": [
    "✓ 出欠を15人にLINEで送信",
    "✓ Googleカレンダーに追加",
    "✓ 12人が参加、2人が不参加",
    "✓ 助っ人1人が承諾",
    "✓ 前日にリマインダー送信",
    "✓ 試合確定",
  ],
  "来週の日曜、練習できる？": [
    "✓ 出欠を15人に送信",
    "✓ 9人が参加可能",
    "✓ 八部公園 9:00-12:00 空きあり",
    "✓ 予約しますか？",
  ],
  "今月の予定を見せて": [
    "📅 4/5 練習 八部公園 9:00-12:00",
    "📅 4/11 練習試合 vs レッドソックス",
    "📅 4/19 リーグ戦 第3節",
    "📅 4/26 練習 未定",
  ],
  "助っ人2人探して": [
    "✓ 外山さん — ピッチャー、信頼度★★★",
    "✓ 佐々木さん — 外野手、信頼度★★☆",
    "✓ 2人にLINEで連絡しました",
  ],
  "先週の試合の精算して": [
    "✓ グラウンド代 ¥5,000",
    "✓ 審判代 ¥3,000",
    "✓ ボール代 ¥1,000",
    "✓ 合計 ¥9,000 ÷ 12人 = ¥750/人",
    "✓ PayPayリンクを送信しました",
  ],
};

export default function LandingPage() {
  const router = useRouter();
  const [activeInput, setActiveInput] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [typing, setTyping] = useState(false);
  const [responses, setResponses] = useState<string[]>([]);
  const [visibleResponses, setVisibleResponses] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const runDemo = useCallback(
    (text: string) => {
      cleanup();
      setActiveInput(text);
      setDisplayText("");
      setTyping(true);
      setResponses(DEMO_RESPONSES[text] ?? []);
      setVisibleResponses(0);

      let i = 0;
      timerRef.current = setInterval(() => {
        if (i < text.length) {
          setDisplayText(text.slice(0, i + 1));
          i++;
        } else {
          cleanup();
          setTyping(false);
          let step = 0;
          const resp = DEMO_RESPONSES[text] ?? [];
          timerRef.current = setInterval(() => {
            step++;
            setVisibleResponses(step);
            if (step >= resp.length) cleanup();
          }, 400);
        }
      }, 50);
    },
    [cleanup],
  );

  // Auto-run first demo
  useEffect(() => {
    const timeout = setTimeout(() => runDemo(SUGGESTIONS[0]), 800);
    return () => {
      clearTimeout(timeout);
      cleanup();
    };
  }, [runDemo, cleanup]);

  return (
    <ContentLayout defaultPadding>
      <Box padding={{ top: "xxxl", bottom: "xxxl" }}>
        <SpaceBetween size="xl">
          {/* Logo */}
          <Box textAlign="center">
            <SpaceBetween size="xxs">
              <Box fontSize="display-l" fontWeight="heavy">
                mound
              </Box>
              <Box color="text-body-secondary">
                伝えるだけ。あとは全部、自動。
              </Box>
            </SpaceBetween>
          </Box>

          {/* Demo area */}
          <div
            style={{
              maxWidth: 520,
              margin: "0 auto",
              borderRadius: 16,
              border: "1px solid #e9ebed",
              background: "#fff",
              overflow: "hidden",
              minHeight: 280,
            }}
          >
            {/* Input display */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e9ebed",
                display: "flex",
                alignItems: "center",
                gap: 10,
                minHeight: 52,
              }}
            >
              {displayText ? (
                <>
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: typing ? "#0972d3" : "#037f0c",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#000716",
                    }}
                  >
                    {displayText}
                    {typing && (
                      <span
                        style={{
                          borderRight: "2px solid #0972d3",
                          marginLeft: 1,
                          animation: "blink 1s step-end infinite",
                        }}
                      >
                        &nbsp;
                      </span>
                    )}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 15, color: "#8c8c8c" }}>
                  何をしますか？
                </span>
              )}
            </div>

            {/* Responses */}
            <div style={{ padding: "12px 20px", minHeight: 180 }}>
              {responses.map((r, i) => (
                <div
                  key={`${activeInput}-${r}`}
                  style={{
                    padding: "6px 0",
                    fontSize: 13,
                    color: i < visibleResponses ? "#414d5c" : "transparent",
                    transition: "color 0.3s ease",
                  }}
                >
                  {r}
                </div>
              ))}
            </div>
          </div>

          {/* Suggestion chips */}
          <Box textAlign="center">
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "center",
                maxWidth: 520,
                margin: "0 auto",
              }}
            >
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => runDemo(s)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 20,
                    border:
                      activeInput === s
                        ? "1px solid #0972d3"
                        : "1px solid #e9ebed",
                    background: activeInput === s ? "#f2f8fd" : "#fff",
                    color: activeInput === s ? "#0972d3" : "#414d5c",
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </Box>

          {/* CTA */}
          <Box textAlign="center">
            <Button variant="primary" onClick={() => router.push("/login")}>
              LINEで使ってみる
            </Button>
          </Box>

          {/* Footer */}
          <Box textAlign="center" padding={{ top: "xl" }}>
            <SpaceBetween size="xs">
              <Box color="text-body-secondary" fontSize="body-s">
                <SpaceBetween size="m" direction="horizontal">
                  <Link href="/terms" fontSize="body-s">
                    利用規約
                  </Link>
                  <Link href="/privacy" fontSize="body-s">
                    プライバシーポリシー
                  </Link>
                </SpaceBetween>
              </Box>
              <Box color="text-body-secondary" fontSize="body-s">
                &copy; 2026 mound
              </Box>
            </SpaceBetween>
          </Box>
        </SpaceBetween>
      </Box>

      <style>{`
        @keyframes blink {
          50% { border-color: transparent; }
        }
      `}</style>
    </ContentLayout>
  );
}
