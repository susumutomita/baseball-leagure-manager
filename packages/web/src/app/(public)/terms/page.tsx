"use client";

import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";

export default function TermsPage() {
  return (
    <ContentLayout
      defaultPadding
      header={
        <Header variant="h1" description="最終更新日: 2026年4月1日">
          利用規約
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Container header={<Header variant="h2">第1条（適用）</Header>}>
          <Box variant="p">
            本規約は、当社が提供するサービス「mound」（以下「本サービス」）の利用条件を定めるものです。
            登録ユーザーの皆さまには、本規約に従って本サービスをご利用いただきます。
          </Box>
        </Container>

        <Container header={<Header variant="h2">第2条（利用登録）</Header>}>
          <Box variant="p">
            登録希望者が当社の定める方法によって利用登録を申請し、当社がこれを承認することによって、利用登録が完了するものとします。
          </Box>
        </Container>

        <Container
          header={
            <Header variant="h2">
              第3条（ユーザーIDおよびパスワードの管理）
            </Header>
          }
        >
          <Box variant="p">
            ユーザーは、自己の責任において、本サービスのユーザーIDおよびパスワード（LINE連携を含む認証情報）を適切に管理するものとします。
          </Box>
        </Container>

        <Container header={<Header variant="h2">第4条（禁止事項）</Header>}>
          <SpaceBetween size="xs">
            <Box variant="p">
              ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
            </Box>
            <ul>
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>本サービスの他のユーザーまたは第三者の権利を侵害する行為</li>
              <li>
                本サービスのサーバーまたはネットワークの機能を妨害する行為
              </li>
              <li>本サービスの運営を妨害するおそれのある行為</li>
              <li>不正アクセスをし、またはこれを試みる行為</li>
              <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
              <li>不正な目的を持って本サービスを利用する行為</li>
              <li>その他、当社が不適切と判断する行為</li>
            </ul>
          </SpaceBetween>
        </Container>

        <Container
          header={
            <Header variant="h2">第5条（本サービスの提供の停止等）</Header>
          }
        >
          <SpaceBetween size="xs">
            <Box variant="p">
              当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
            </Box>
            <ul>
              <li>
                本サービスにかかるコンピュータシステムの保守点検または更新を行う場合
              </li>
              <li>
                地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合
              </li>
              <li>その他、当社が本サービスの提供が困難と判断した場合</li>
            </ul>
          </SpaceBetween>
        </Container>

        <Container
          header={<Header variant="h2">第6条（利用制限および登録抹消）</Header>}
        >
          <Box variant="p">
            当社は、ユーザーが本規約のいずれかの条項に違反した場合、事前の通知なく当該ユーザーの本サービスの利用を制限し、またはユーザーとしての登録を抹消することができるものとします。
          </Box>
        </Container>

        <Container header={<Header variant="h2">第7条（免責事項）</Header>}>
          <Box variant="p">
            当社は、本サービスに事実上または法律上の瑕疵がないことを明示的にも黙示的にも保証しておりません。
            当社は、本サービスに起因してユーザーに生じたあらゆる損害について一切の責任を負いません。
          </Box>
        </Container>

        <Container
          header={<Header variant="h2">第8条（サービス内容の変更等）</Header>}
        >
          <Box variant="p">
            当社は、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
          </Box>
        </Container>

        <Container
          header={<Header variant="h2">第9条（利用規約の変更）</Header>}
        >
          <Box variant="p">
            当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
          </Box>
        </Container>

        <Container
          header={<Header variant="h2">第10条（準拠法・裁判管轄）</Header>}
        >
          <Box variant="p">
            本規約の解釈にあたっては、日本法を準拠法とします。
            本サービスに関して紛争が生じた場合には、東京地方裁判所を専属的合意管轄とします。
          </Box>
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}
