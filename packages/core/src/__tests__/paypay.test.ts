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
});
