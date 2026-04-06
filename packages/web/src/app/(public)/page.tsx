"use client";

import { LoginModal } from "@/components/LoginModal";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { Suspense, useState } from "react";

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);

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
          <Button variant="primary" onClick={() => setShowLogin(true)}>
            LINEで始める
          </Button>
        </Box>
      </SpaceBetween>

      <Suspense>
        <LoginModal visible={showLogin} onDismiss={() => setShowLogin(false)} />
      </Suspense>
    </div>
  );
}
