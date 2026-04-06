import { describe, expect, it } from "vitest";
import {
  buildTeamInvitationUrl,
  createInvitation,
  generateInviteCode,
  useInvitation,
  validateTeamInvitation,
} from "../lib/invitation-manager";
import { createTeamInvitationFixture } from "../lib/test-fixtures";

describe("generateInviteCode", () => {
  it("8文字のコードを生成する", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(8);
  });

  it("紛らわしい文字を含まない", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateInviteCode();
      expect(code).not.toMatch(/[0OlI1]/);
    }
  });
});

describe("createInvitation", () => {
  it("デフォルト値で招待を作成する", () => {
    const result = createInvitation({
      team_id: "team-1",
      invite_type: "OPPONENT",
      created_by: "user-1",
    });
    expect(result.team_id).toBe("team-1");
    expect(result.invite_type).toBe("OPPONENT");
    expect(result.use_count).toBe(0);
    expect(result.is_active).toBe(true);
    expect(result.invite_code).toHaveLength(8);
  });
});

describe("validateTeamInvitation", () => {
  it("有効な招待を許可する", () => {
    const invitation = createTeamInvitationFixture();
    const result = validateTeamInvitation(invitation);
    expect(result.valid).toBe(true);
  });

  it("無効化された招待を拒否する", () => {
    const invitation = createTeamInvitationFixture({ is_active: false });
    const result = validateTeamInvitation(invitation);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("INACTIVE");
  });

  it("期限切れの招待を拒否する", () => {
    const invitation = createTeamInvitationFixture({
      expires_at: "2026-01-01T00:00:00Z",
    });
    const result = validateTeamInvitation(
      invitation,
      new Date("2026-06-01T00:00:00Z"),
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe("EXPIRED");
  });

  it("使用回数上限に達した招待を拒否する", () => {
    const invitation = createTeamInvitationFixture({
      max_uses: 5,
      use_count: 5,
    });
    const result = validateTeamInvitation(invitation);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("MAX_USES_REACHED");
  });
});

describe("useInvitation", () => {
  it("use_countをインクリメントする", () => {
    const invitation = createTeamInvitationFixture({ use_count: 3 });
    const result = useInvitation(invitation);
    expect(result.use_count).toBe(4);
  });
});

describe("buildTeamInvitationUrl", () => {
  it("正しいURLを構築する", () => {
    const url = buildTeamInvitationUrl("https://mound.app", "ABC12345");
    expect(url).toBe("https://mound.app/invite/ABC12345");
  });
});
