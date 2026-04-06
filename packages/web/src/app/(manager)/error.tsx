"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ContentLayout header={<Header variant="h1">エラーが発生しました</Header>}>
      <Container>
        <SpaceBetween size="l">
          <Box variant="p">ページの読み込み中にエラーが発生しました。</Box>
          <Box color="text-body-secondary" fontSize="body-s">
            {error.message}
          </Box>
          <Button variant="primary" onClick={reset}>
            再読み込み
          </Button>
        </SpaceBetween>
      </Container>
    </ContentLayout>
  );
}
