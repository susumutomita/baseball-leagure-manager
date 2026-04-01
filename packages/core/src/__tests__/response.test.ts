import { describe, expect, it } from "bun:test";
import { apiError, apiSuccess } from "../lib/response";

describe("apiSuccess", () => {
  it("data\u3068next_actions\u3092\u542b\u3080\u30ec\u30b9\u30dd\u30f3\u30b9\u3092\u8fd4\u3059", () => {
    const res = apiSuccess({ id: "1" }, [
      {
        action: "transition_game",
        reason: "\u51fa\u6b20\u3092\u96c6\u3081\u3066\u304f\u3060\u3055\u3044",
        priority: "high" as const,
      },
    ]);
    expect(res.data.id).toBe("1");
    expect(res.next_actions).toHaveLength(1);
    expect(res.next_actions[0].action).toBe("transition_game");
  });

  it("next_actions\u304c\u7a7a\u3067\u3082\u52d5\u4f5c\u3059\u308b", () => {
    const res = apiSuccess({ ok: true });
    expect(res.next_actions).toEqual([]);
  });

  it("meta\u3092\u542b\u3081\u3089\u308c\u308b", () => {
    const res = apiSuccess({ id: "1" }, [], { total: 10 });
    expect(res.meta?.total).toBe(10);
  });
});

describe("apiError", () => {
  it("error_code\u3068next_actions\u3092\u542b\u3080\u30ec\u30b9\u30dd\u30f3\u30b9\u3092\u8fd4\u3059", () => {
    const res = apiError(
      "INVALID_TRANSITION",
      "\u9077\u79fb\u304c\u4e0d\u6b63\u3067\u3059",
      [
        {
          action: "get_game",
          reason:
            "\u73fe\u5728\u306e\u72b6\u614b\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044",
          priority: "high" as const,
        },
      ],
    );
    expect(res.error_code).toBe("INVALID_TRANSITION");
    expect(res.error).toBe("\u9077\u79fb\u304c\u4e0d\u6b63\u3067\u3059");
    expect(res.next_actions).toHaveLength(1);
  });

  it("\u8ffd\u52a0\u30d5\u30a3\u30fc\u30eb\u30c9\u3092\u542b\u3081\u3089\u308c\u308b", () => {
    const res = apiError(
      "INVALID_TRANSITION",
      "\u9077\u79fb\u304c\u4e0d\u6b63\u3067\u3059",
      [],
      {
        current_status: "DRAFT",
        available_transitions: ["COLLECTING"],
      },
    );
    expect(res.current_status).toBe("DRAFT");
  });
});
