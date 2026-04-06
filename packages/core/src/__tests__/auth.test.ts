import { describe, expect, it } from "vitest";
import { InsufficientRoleError, assertRole, hasRole } from "../lib/auth";

describe("hasRole", () => {
  describe("SUPER_ADMINのとき", () => {
    it("全てのロールチェックを通過する", () => {
      expect(hasRole("SUPER_ADMIN", "MEMBER")).toBe(true);
      expect(hasRole("SUPER_ADMIN", "ADMIN")).toBe(true);
      expect(hasRole("SUPER_ADMIN", "SUPER_ADMIN")).toBe(true);
    });
  });

  describe("ADMINのとき", () => {
    it("MEMBER・ADMINチェックを通過する", () => {
      expect(hasRole("ADMIN", "MEMBER")).toBe(true);
      expect(hasRole("ADMIN", "ADMIN")).toBe(true);
    });

    it("SUPER_ADMINチェックは失敗する", () => {
      expect(hasRole("ADMIN", "SUPER_ADMIN")).toBe(false);
    });
  });

  describe("MEMBERのとき", () => {
    it("MEMBERチェックのみ通過する", () => {
      expect(hasRole("MEMBER", "MEMBER")).toBe(true);
    });

    it("ADMIN以上のチェックは失敗する", () => {
      expect(hasRole("MEMBER", "ADMIN")).toBe(false);
      expect(hasRole("MEMBER", "SUPER_ADMIN")).toBe(false);
    });
  });
});

describe("assertRole", () => {
  it("権限が足りているとき例外を投げない", () => {
    expect(() => assertRole("ADMIN", "ADMIN")).not.toThrow();
    expect(() => assertRole("SUPER_ADMIN", "ADMIN")).not.toThrow();
  });

  it("権限が不足しているとき InsufficientRoleError を投げる", () => {
    expect(() => assertRole("MEMBER", "ADMIN")).toThrow(InsufficientRoleError);
  });
});
