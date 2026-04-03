import Box from "@cloudscape-design/components/box";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";

export default function NotFound() {
  return (
    <Box padding="xxxl" textAlign="center">
      <SpaceBetween size="l">
        <Header variant="h1">ページが見つかりません</Header>
        <Box variant="p" color="text-body-secondary">
          お探しのページは存在しないか、移動された可能性があります。
        </Box>
        <Link href="/">ダッシュボードに戻る</Link>
      </SpaceBetween>
    </Box>
  );
}
