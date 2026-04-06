"use client";

import { LoginModal } from "@/components/LoginModal";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { Suspense } from "react";

/**
 * /login ページ — ミドルウェアからリダイレクトされた場合のフォールバック
 * モーダルを自動表示してランディングページと同じ体験を提供
 */
export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
      }}
    >
      <SpaceBetween size="xl">
        <Box textAlign="center">
          <Box fontSize="display-l" fontWeight="heavy">
            mound
          </Box>
        </Box>

        <Box textAlign="center">
          <Box fontSize="heading-xl" fontWeight="bold">
            チーム運営が、勝手に回る。
          </Box>
        </Box>
      </SpaceBetween>

      <Suspense>
        <LoginModal visible onDismiss={() => window.history.back()} />
      </Suspense>
    </div>
  );
}
