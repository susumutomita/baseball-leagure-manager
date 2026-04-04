import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";

export default function NotFound() {
  return (
    <Box padding="xxxl" textAlign="center">
      <SpaceBetween size="l">
        <Box variant="h1" fontSize="display-l" fontWeight="bold">
          404
        </Box>
        <Header variant="h1">ページが見つかりません</Header>
        <Box variant="p" color="text-body-secondary">
          お探しのページは存在しないか、移動された可能性があります。
          <br />
          URL をご確認のうえ、再度アクセスしてください。
        </Box>
        <Button variant="primary" href="/">
          ダッシュボードに戻る
        </Button>
      </SpaceBetween>
    </Box>
  );
}
