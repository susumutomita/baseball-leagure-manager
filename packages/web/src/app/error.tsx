"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <Box padding="xxxl" textAlign="center">
      <SpaceBetween size="l">
        <Header variant="h1">エラーが発生しました</Header>
        <Box variant="p" color="text-body-secondary">
          予期しないエラーが発生しました。もう一度お試しください。
        </Box>
        {error.digest && (
          <Box variant="small" color="text-status-inactive">
            エラーコード: {error.digest}
          </Box>
        )}
        <SpaceBetween size="s" direction="horizontal">
          <Button variant="primary" onClick={reset}>
            再試行
          </Button>
          <Button variant="link" href="/">
            ダッシュボードに戻る
          </Button>
        </SpaceBetween>
      </SpaceBetween>
    </Box>
  );
}
