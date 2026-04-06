import { describe, expect, it } from "vitest";
import { recommendTeams, searchPublicTeams } from "../lib/team-discovery";
import { createTeamProfileFixture } from "../lib/test-fixtures";

const profiles = [
  createTeamProfileFixture({
    id: "p1",
    team_id: "team-1",
    is_public: true,
    activity_area: "東京都・世田谷区",
    skill_level: "INTERMEDIATE",
    looking_for_opponents: true,
    member_count: 15,
  }),
  createTeamProfileFixture({
    id: "p2",
    team_id: "team-2",
    is_public: true,
    activity_area: "東京都・世田谷区",
    skill_level: "ADVANCED",
    looking_for_opponents: false,
    member_count: 12,
  }),
  createTeamProfileFixture({
    id: "p3",
    team_id: "team-3",
    is_public: true,
    activity_area: "神奈川県・横浜市",
    skill_level: "BEGINNER",
    looking_for_opponents: true,
    member_count: 10,
  }),
  createTeamProfileFixture({
    id: "p4",
    team_id: "team-4",
    is_public: false,
    activity_area: "東京都・世田谷区",
  }),
];

describe("searchPublicTeams", () => {
  it("公開プロフィールのみ返す", () => {
    const result = searchPublicTeams(profiles, {});
    expect(result).toHaveLength(3);
    expect(result.every((p) => p.is_public)).toBe(true);
  });

  it("エリアでフィルタリングできる", () => {
    const result = searchPublicTeams(profiles, {
      area: "東京都・世田谷区",
    });
    expect(result).toHaveLength(2);
  });

  it("対戦相手募集中のチームだけ取得できる", () => {
    const result = searchPublicTeams(profiles, {
      looking_for_opponents: true,
    });
    expect(result).toHaveLength(2);
  });

  it("複数フィルタを組み合わせられる", () => {
    const result = searchPublicTeams(profiles, {
      area: "東京都・世田谷区",
      looking_for_opponents: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0].team_id).toBe("team-1");
  });
});

describe("recommendTeams", () => {
  const myProfile = createTeamProfileFixture({
    team_id: "my-team",
    activity_area: "東京都・世田谷区",
    skill_level: "INTERMEDIATE",
  });

  it("自チームを除外する", () => {
    const result = recommendTeams(myProfile, profiles);
    expect(result.every((p) => p.team_id !== "my-team")).toBe(true);
  });

  it("非公開チームを除外する", () => {
    const result = recommendTeams(myProfile, profiles);
    expect(result.every((p) => p.is_public)).toBe(true);
  });

  it("エリア一致・スキル近接のチームを高スコアにする", () => {
    const result = recommendTeams(myProfile, profiles);
    // team-1: エリア一致(+30) + スキル同じ(+20) + 対戦募集(+15) + 9人以上(+10) = 75
    // team-2: エリア一致(+30) + スキル距離1(+13) + 9人以上(+10) = 53
    // team-3: エリア不一致(0) + スキル距離2(+6) + 対戦募集(+15) + 9人以上(+10) = 31
    expect(result[0].team_id).toBe("team-1");
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });
});
