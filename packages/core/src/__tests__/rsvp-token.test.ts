import { describe, expect, it } from "vitest";
import {
  buildRsvpUrl,
  decodeRsvpToken,
  generateRsvpToken,
  validateRsvpToken,
} from "../lib/rsvp-token";

describe("generateRsvpToken", () => {
  it("Base64urlエンコードされたトークンを生成する", () => {
    const token = generateRsvpToken({
      gameId: "game-1",
      memberId: "member-1",
      rsvpId: "rsvp-1",
      expiresAt: "2026-12-31T00:00:00Z",
    });
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });
});

describe("decodeRsvpToken", () => {
  it("生成したトークンをデコードできる", () => {
    const payload = {
      gameId: "game-1",
      memberId: "member-1",
      rsvpId: "rsvp-1",
      expiresAt: "2026-12-31T00:00:00Z",
    };
    const token = generateRsvpToken(payload);
    const decoded = decodeRsvpToken(token);
    expect(decoded).toEqual(payload);
  });

  it("不正なトークンでnullを返す", () => {
    expect(decodeRsvpToken("invalid-token")).toBeNull();
  });

  it("フィールドが欠けたJSONでnullを返す", () => {
    const broken = Buffer.from(JSON.stringify({ gameId: "x" })).toString(
      "base64url",
    );
    expect(decodeRsvpToken(broken)).toBeNull();
  });
});

describe("validateRsvpToken", () => {
  it("有効なトークンを受け入れる", () => {
    const token = generateRsvpToken({
      gameId: "game-1",
      memberId: "member-1",
      rsvpId: "rsvp-1",
      expiresAt: "2099-12-31T00:00:00Z",
    });
    const result = validateRsvpToken(token);
    expect(result.valid).toBe(true);
    expect(result.payload?.gameId).toBe("game-1");
  });

  it("期限切れのトークンを拒否する", () => {
    const token = generateRsvpToken({
      gameId: "game-1",
      memberId: "member-1",
      rsvpId: "rsvp-1",
      expiresAt: "2020-01-01T00:00:00Z",
    });
    const result = validateRsvpToken(token);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("有効期限");
  });

  it("不正なトークンを拒否する", () => {
    const result = validateRsvpToken("garbage");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("無効");
  });
});

describe("buildRsvpUrl", () => {
  it("正しいURLを構築する", () => {
    const url = buildRsvpUrl("https://mound.app", "abc123");
    expect(url).toBe("https://mound.app/rsvp/abc123");
  });
});
