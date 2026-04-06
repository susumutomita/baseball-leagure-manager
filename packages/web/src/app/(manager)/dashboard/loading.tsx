import Box from "@cloudscape-design/components/box";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Spinner from "@cloudscape-design/components/spinner";

export default function DashboardLoading() {
  return (
    <ContentLayout
      header={
        <Header variant="h1" description="読み込み中...">
          ダッシュボード
        </Header>
      }
    >
      <SpaceBetween size="l">
        <ColumnLayout columns={3}>
          {[1, 2, 3].map((i) => (
            <Container key={i}>
              <Box variant="awsui-key-label">--</Box>
              <Box variant="h1" tagOverride="p">
                <Spinner size="normal" />
              </Box>
            </Container>
          ))}
        </ColumnLayout>
      </SpaceBetween>
    </ContentLayout>
  );
}
