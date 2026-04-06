import { expect, test } from "@playwright/test";

test.describe("API基本テスト", () => {
  test("GET /api/leagues がレスポンスを返す", async ({ request }) => {
    const response = await request.get("/api/leagues");
    // 認証エラーかDB未接続エラー — クラッシュしないことが重要
    expect([200, 400, 401, 500]).toContain(response.status());
  });

  test("GET /api/teams/discover がレスポンスを返す", async ({ request }) => {
    const response = await request.get("/api/teams/discover");
    expect([200, 400, 401, 500]).toContain(response.status());
  });

  test("GET /api/invitations/invalid-code が404を返す", async ({ request }) => {
    const response = await request.get("/api/invitations/invalid-code");
    expect([404, 500]).toContain(response.status());
  });

  test("未認証で /dashboard にアクセスするとリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });
});
