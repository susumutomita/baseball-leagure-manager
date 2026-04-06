import { describe, expect, it } from "bun:test";
import {
  buildInvitationUrl,
  createInvitationPayload,
  decodeInvitationToken,
  generateInvitationToken,
  validateInvitation,
} from "../lib/invitation";

const TEST_SECRET = "test-secret-key";

describe("generateInvitationToken / decodeInvitationToken", () => {
  it("ペイロードをエンコード・デコードできる", () => {
    const payload = createInvitationPayload("team-1", "テストチーム", "user-1");
    const token = generateInvitationToken(payload, TEST_SECRET);
    const decoded = decodeInvitationToken(token, TEST_SECRET);

    expect(decoded).not.toBeNull();
    expect(decoded?.teamId).toBe("team-1");
    expect(decoded?.teamName).toBe("テストチーム");
    expect(decoded?.invitedBy).toBe("user-1");
    expect(decoded?.role).toBe("MEMBER");
  });

  it("不正なトークンはnullを返す", () => {
    expect(
      decodeInvitationToken("not-valid-base64!!!", TEST_SECRET),
    ).toBeNull();
  });

  it("署名が改ざんされたトークンはnullを返す", () => {
    const payload = createInvitationPayload("team-1", "テストチーム", "user-1");
    const token = generateInvitationToken(payload, TEST_SECRET);
    const tampered = `${token.split(".")[0]}.tampered-signature`;
    expect(decodeInvitationToken(tampered, TEST_SECRET)).toBeNull();
  });

  it("異なるシークレットで署名されたトークンはnullを返す", () => {
    const payload = createInvitationPayload("team-1", "テストチーム", "user-1");
    const token = generateInvitationToken(payload, "secret-a");
    expect(decodeInvitationToken(token, "secret-b")).toBeNull();
  });
});

describe("validateInvitation", () => {
  it("有効な招待トークンを検証する", () => {
    const payload = createInvitationPayload("team-1", "テストチーム", "user-1");
    const token = generateInvitationToken(payload, TEST_SECRET);
    const result = validateInvitation(token, new Date(), TEST_SECRET);
    expect(result.valid).toBe(true);
    expect(result.payload?.teamId).toBe("team-1");
  });

  it("有効期限切れの招待を拒否する", () => {
    const payload = {
      teamId: "team-1",
      teamName: "テストチーム",
      invitedBy: "user-1",
      role: "MEMBER" as const,
      expiresAt: "2020-01-01T00:00:00Z",
    };
    const token = generateInvitationToken(payload, TEST_SECRET);
    const result = validateInvitation(token, new Date(), TEST_SECRET);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("有効期限");
  });

  it("不正なトークンを拒否する", () => {
    const result = validateInvitation("garbage", new Date(), TEST_SECRET);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("無効");
  });
});

describe("buildInvitationUrl", () => {
  it("招待URLを構築する", () => {
    const url = buildInvitationUrl("https://mound.app", "token123");
    expect(url).toBe("https://mound.app/invite/token123");
  });
});

describe("createInvitationPayload", () => {
  it("デフォルトで7日後の有効期限を設定する", () => {
    const payload = createInvitationPayload("team-1", "テストチーム", "user-1");
    const expiresAt = new Date(payload.expiresAt);
    const now = new Date();
    const diffDays =
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(7, 0);
  });

  it("カスタム有効期限を設定できる", () => {
    const payload = createInvitationPayload(
      "team-1",
      "テストチーム",
      "user-1",
      "ADMIN",
      30,
    );
    expect(payload.role).toBe("ADMIN");
    const expiresAt = new Date(payload.expiresAt);
    const now = new Date();
    const diffDays =
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(30, 0);
  });
});
