"use client";

import Box from "@cloudscape-design/components/box";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";

function SkeletonLine({ width = "100%" }: { width?: string }) {
  return (
    <div
      style={{
        height: "16px",
        width,
        backgroundColor: "#e9ebed",
        borderRadius: "4px",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

function SkeletonBlock() {
  return (
    <SpaceBetween size="s">
      <SkeletonLine width="60%" />
      <SkeletonLine width="80%" />
      <SkeletonLine width="40%" />
    </SpaceBetween>
  );
}

export default function GameDetailLoading() {
  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <SpaceBetween size="l">
        <Header variant="h1">
          <SkeletonLine width="300px" />
        </Header>

        <ColumnLayout columns={2}>
          <Container
            header={
              <Header variant="h2">
                <Box color="text-status-inactive">試合情報</Box>
              </Header>
            }
          >
            <SkeletonBlock />
          </Container>
          <Container
            header={
              <Header variant="h2">
                <Box color="text-status-inactive">出欠状況</Box>
              </Header>
            }
          >
            <SkeletonBlock />
          </Container>
        </ColumnLayout>

        <Container
          header={
            <Header variant="h2">
              <Box color="text-status-inactive">メンバー一覧</Box>
            </Header>
          }
        >
          <SpaceBetween size="s">
            <SkeletonLine />
            <SkeletonLine />
            <SkeletonLine />
            <SkeletonLine />
            <SkeletonLine />
          </SpaceBetween>
        </Container>
      </SpaceBetween>
    </>
  );
}
