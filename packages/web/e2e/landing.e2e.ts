import { expect, test } from "@playwright/test";

test.describe("ランディングページ", () => {
  test("タイトル・メッセージ・CTAが表示される", async ({ page }) => {
    await page.goto("/");

    // タブタイトル
    await expect(page).toHaveTitle("mound");

    // メインメッセージ
    await expect(page.getByText("チーム運営が、勝手に回る。")).toBeVisible();

    // CTAボタン
    const ctaButton = page.getByRole("button", { name: "LINEで始める" });
    await expect(ctaButton).toBeVisible();
  });

  test("ナビバーに「ログイン」ボタンがある", async ({ page }) => {
    await page.goto("/");
    const loginButton = page.getByRole("button", { name: "ログイン" });
    await expect(loginButton).toBeVisible();
  });
});

test.describe("ログインモーダル", () => {
  test("「LINEで始める」クリックでモーダルが開く", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "LINEで始める" }).click();

    // モーダルが表示される
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();

    // モーダル内に「LINE でログイン」ボタンがある
    await expect(
      modal.getByRole("button", { name: "LINE でログイン" }),
    ).toBeVisible();
  });

  test("ナビバーの「ログイン」でもモーダルが開く", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "ログイン" }).click();

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
  });

  test("モーダルを閉じられる", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "LINEで始める" }).click();

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();

    // Escape キーでモーダルを閉じる
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
  });
});

test.describe("/login フォールバック", () => {
  test("モーダルが自動表示される", async ({ page }) => {
    await page.goto("/login");

    // ランディングページの世界観が表示される
    await expect(page.getByText("チーム運営が、勝手に回る。")).toBeVisible();

    // モーダルが自動で開いている
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await expect(
      modal.getByRole("button", { name: "LINE でログイン" }),
    ).toBeVisible();
  });
});
