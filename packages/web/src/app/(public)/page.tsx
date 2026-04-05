"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

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

        <Box textAlign="center">
          <Button variant="primary" onClick={() => router.push("/login")}>
            LINEで始める
          </Button>
        </Box>
      </SpaceBetween>

      <div
        style={{
          position: "fixed",
          bottom: 24,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
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
      </div>
    </div>
  );
}
