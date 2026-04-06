import { describe, expect, it } from "vitest";
import {
  buildRsvpUrl,
  decodeRsvpToken,
  generateRsvpToken,
  validateRsvpToken,
} from "../lib/rsvp-token";

const TEST_SECRET = "test-secret-key-for-hmac";

describe("generateRsvpToken", () => {
  it("署名付きトークンを生成する", () => {
    const token = generateRsvpToken(
      {
        gameId: "game-1",
        memberId: "member-1",
        rsvpId: "rsvp-1",
        expiresAt: "2026-12-31T00:00:00Z",
      },
      TEST_SECRET,
    );
    expect(typeof token).toBe("string");
    expect(token).toContain(".");
    expect(token.split(".")).toHaveLength(2);
  });
});

describe("decodeRsvpToken", () => {
  it("正しい署名のトークンをデコードできる", () => {
    const payload = {
      gameId: "game-1",
      memberId: "member-1",
      rsvpId: "rsvp-1",
      expiresAt: "2026-12-31T00:00:00Z",
    };
    const token = generateRsvpToken(payload, TEST_SECRET);
    const decoded = decodeRsvpToken(token, TEST_SECRET);
    expect(decoded).toEqual(payload);
  });

  it("改ざんされたトークンを拒否する", () => {
    const token = generateRsvpToken(
      {
        gameId: "game-1",
        memberId: "member-1",
        rsvpId: "rsvp-1",
        expiresAt: "2026-12-31T00:00:00Z",
      },
      TEST_SECRET,
    );
    const parts = token.split(".");
    const tampered = `${parts[0]}x.${parts[1]}`;
    expect(decodeRsvpToken(tampered, TEST_SECRET)).toBeNull();
  });

  it("署名が異なるシークレットのトークンを拒否する", () => {
    const token = generateRsvpToken(
      {
        gameId: "game-1",
        memberId: "member-1",
        rsvpId: "rsvp-1",
        expiresAt: "2026-12-31T00:00:00Z",
      },
      "secret-A",
    );
    expect(decodeRsvpToken(token, "secret-B")).toBeNull();
  });

  it("不正なトークンでnullを返す", () => {
    expect(decodeRsvpToken("invalid-token", TEST_SECRET)).toBeNull();
  });

  it("署名がないトークンを拒否する", () => {
    const encoded = Buffer.from(
      JSON.stringify({
        gameId: "x",
        memberId: "y",
        rsvpId: "z",
        expiresAt: "2099-01-01T00:00:00Z",
      }),
    ).toString("base64url");
    expect(decodeRsvpToken(encoded, TEST_SECRET)).toBeNull();
  });
});

describe("validateRsvpToken", () => {
  it("有効なトークンを受け入れる", () => {
    const token = generateRsvpToken(
      {
        gameId: "game-1",
        memberId: "member-1",
        rsvpId: "rsvp-1",
        expiresAt: "2099-12-31T00:00:00Z",
      },
      TEST_SECRET,
    );
    const result = validateRsvpToken(token, new Date(), TEST_SECRET);
    expect(result.valid).toBe(true);
    expect(result.payload?.gameId).toBe("game-1");
  });

  it("期限切れのトークンを拒否する", () => {
    const token = generateRsvpToken(
      {
        gameId: "game-1",
        memberId: "member-1",
        rsvpId: "rsvp-1",
        expiresAt: "2020-01-01T00:00:00Z",
      },
      TEST_SECRET,
    );
    const result = validateRsvpToken(token, new Date(), TEST_SECRET);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("有効期限");
  });

  it("改ざんされたトークンを拒否する", () => {
    const result = validateRsvpToken("forged.token", new Date(), TEST_SECRET);
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
