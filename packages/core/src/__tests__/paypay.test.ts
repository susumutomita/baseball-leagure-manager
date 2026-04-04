import { describe, expect, it } from "bun:test";
import { generatePayPayLink } from "../lib/paypay";

describe("generatePayPayLink", () => {
  describe("有効な金額と説明を渡したとき", () => {
    it("有効なURLを返す", () => {
      const link = generatePayPayLink(1500, "グラウンド代");

      expect(() => new URL(link)).not.toThrow();
      expect(link).toContain("https://pay.paypay.ne.jp/request");
    });

    it("金額がクエリパラメータに含まれる", () => {
      const link = generatePayPayLink(2000, "精算");
      const url = new URL(link);

      expect(url.searchParams.get("amount")).toBe("2000");
    });

    it("説明文がエンコードされてクエリパラメータに含まれる", () => {
      const link = generatePayPayLink(1000, "4/3 練習試合 精算");
      const url = new URL(link);

      expect(url.searchParams.get("description")).toBe("4/3 練習試合 精算");
    });
  });

  describe("さまざまな金額を渡したとき", () => {
    it("小さい金額 (100円) でもURLが生成される", () => {
      const link = generatePayPayLink(100, "ドリンク代");
      const url = new URL(link);

      expect(url.searchParams.get("amount")).toBe("100");
    });

    it("大きい金額 (100,000円) でもURLが生成される", () => {
      const link = generatePayPayLink(100000, "年間利用料");
      const url = new URL(link);

      expect(url.searchParams.get("amount")).toBe("100000");
    });

    it("金額が0のときもURLが生成される", () => {
      const link = generatePayPayLink(0, "テスト");
      const url = new URL(link);

      expect(url.searchParams.get("amount")).toBe("0");
    });

    it("負の金額でもURLが生成される (バリデーションは呼び出し側の責務)", () => {
      const link = generatePayPayLink(-500, "返金");
      const url = new URL(link);

      expect(url.searchParams.get("amount")).toBe("-500");
    });

    it("小数点を含む金額もURLに含まれる", () => {
      const link = generatePayPayLink(1500.5, "端数精算");
      const url = new URL(link);

      expect(url.searchParams.get("amount")).toBe("1500.5");
    });
  });

  describe("説明文に特殊文字が含まれるとき", () => {
    it("日本語の説明文が正しくエンコード・デコードされる", () => {
      const description = "春季リーグ第1節 グラウンド代＋審判代";
      const link = generatePayPayLink(3000, description);
      const url = new URL(link);

      expect(url.searchParams.get("description")).toBe(description);
    });

    it("アンパサンドを含む説明文が正しく処理される", () => {
      const link = generatePayPayLink(2000, "A&Bチーム合同精算");
      const url = new URL(link);

      expect(url.searchParams.get("description")).toBe("A&Bチーム合同精算");
    });

    it("イコール記号を含む説明文が正しく処理される", () => {
      const link = generatePayPayLink(1000, "参加費=1000円");
      const url = new URL(link);

      expect(url.searchParams.get("description")).toBe("参加費=1000円");
    });

    it("空文字の説明文でもURLが生成される", () => {
      const link = generatePayPayLink(1000, "");
      const url = new URL(link);

      expect(url.searchParams.get("description")).toBe("");
    });

    it("スラッシュを含む日付形式の説明文が正しく処理される", () => {
      const link = generatePayPayLink(800, "4/3 試合 精算");
      const url = new URL(link);

      expect(url.searchParams.get("description")).toBe("4/3 試合 精算");
    });
  });

  describe("URL構造の検証", () => {
    it("ベースURLが正しいこと", () => {
      const link = generatePayPayLink(1000, "テスト");
      const url = new URL(link);

      expect(url.origin).toBe("https://pay.paypay.ne.jp");
      expect(url.pathname).toBe("/request");
    });

    it("amount と description の2つのパラメータのみ含むこと", () => {
      const link = generatePayPayLink(1000, "テスト");
      const url = new URL(link);
      const params = Array.from(url.searchParams.keys());

      expect(params).toEqual(["amount", "description"]);
    });
  });
});
