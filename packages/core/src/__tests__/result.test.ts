import { describe, expect, it } from "vitest";
import { type AppError, err, formatError, httpStatus, ok } from "../lib/result";

describe("Result\u578b", () => {
  describe("ok", () => {
    it("ok: true\u3068value\u3092\u6301\u3064", () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });
  });

  describe("err", () => {
    it("ok: false\u3068error\u3092\u6301\u3064", () => {
      const result = err({
        type: "NOT_FOUND" as const,
        entity: "game",
        id: "123",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("NOT_FOUND");
      }
    });
  });
});

describe("formatError", () => {
  it("INVALID_TRANSITION\u306e\u30e1\u30c3\u30bb\u30fc\u30b8\u3092\u751f\u6210\u3059\u308b", () => {
    const error: AppError = {
      type: "INVALID_TRANSITION",
      from: "DRAFT",
      to: "CONFIRMED",
      available: ["COLLECTING"],
    };
    expect(formatError(error)).toContain("DRAFT");
    expect(formatError(error)).toContain("CONFIRMED");
  });

  it("INSUFFICIENT_MEMBERS\u306e\u30e1\u30c3\u30bb\u30fc\u30b8\u3092\u751f\u6210\u3059\u308b", () => {
    const error: AppError = {
      type: "INSUFFICIENT_MEMBERS",
      actual: 5,
      required: 9,
    };
    expect(formatError(error)).toContain("5");
    expect(formatError(error)).toContain("9");
  });

  it("MISSING_OPPONENT\u306e\u30e1\u30c3\u30bb\u30fc\u30b8\u3092\u751f\u6210\u3059\u308b", () => {
    const error: AppError = {
      type: "MISSING_OPPONENT",
      gameType: "FRIENDLY",
    };
    expect(formatError(error)).toContain("\u5bfe\u6226\u76f8\u624b");
  });

  it("GROUND_NOT_CONFIRMED\u306e\u30e1\u30c3\u30bb\u30fc\u30b8\u3092\u751f\u6210\u3059\u308b", () => {
    const error: AppError = { type: "GROUND_NOT_CONFIRMED" };
    expect(formatError(error)).toContain("\u30b0\u30e9\u30a6\u30f3\u30c9");
  });

  it("DEADLINE_NOT_REACHED\u306e\u30e1\u30c3\u30bb\u30fc\u30b8\u3092\u751f\u6210\u3059\u308b", () => {
    const error: AppError = {
      type: "DEADLINE_NOT_REACHED",
      responded: 10,
      total: 15,
    };
    expect(formatError(error)).toContain("10");
    expect(formatError(error)).toContain("15");
  });

  it("VALIDATION_ERROR\u306e\u30e1\u30c3\u30bb\u30fc\u30b8\u3092\u751f\u6210\u3059\u308b", () => {
    const error: AppError = {
      type: "VALIDATION_ERROR",
      issues: [{ path: "title", message: "\u5fc5\u9808\u3067\u3059" }],
    };
    expect(formatError(error)).toContain("title");
    expect(formatError(error)).toContain("\u5fc5\u9808\u3067\u3059");
  });

  it("DATABASE_ERROR\u306e\u30e1\u30c3\u30bb\u30fc\u30b8\u3092\u751f\u6210\u3059\u308b", () => {
    const error: AppError = {
      type: "DATABASE_ERROR",
      message: "connection refused",
    };
    expect(formatError(error)).toContain("connection refused");
  });

  it("NOT_FOUND\u306e\u30e1\u30c3\u30bb\u30fc\u30b8\u3092\u751f\u6210\u3059\u308b", () => {
    const error: AppError = {
      type: "NOT_FOUND",
      entity: "game",
      id: "abc",
    };
    expect(formatError(error)).toContain("game");
    expect(formatError(error)).toContain("abc");
  });

  it("CONFLICTのメッセージを生成する", () => {
    const error: AppError = {
      type: "CONFLICT",
      entity: "game",
      message: "他のユーザーが更新しました",
    };
    expect(formatError(error)).toContain("game");
    expect(formatError(error)).toContain("他のユーザーが更新しました");
  });

  it("EXTERNAL_SERVICE_ERRORのメッセージを生成する", () => {
    const error: AppError = {
      type: "EXTERNAL_SERVICE_ERROR",
      service: "LINE",
      message: "タイムアウト",
      retryable: true,
    };
    expect(formatError(error)).toContain("LINE");
    expect(formatError(error)).toContain("タイムアウト");
  });

  it("AUTHORIZATION_ERRORのメッセージを生成する", () => {
    const error: AppError = {
      type: "AUTHORIZATION_ERROR",
      requiredRole: "ADMIN",
      actualRole: "MEMBER",
    };
    expect(formatError(error)).toContain("ADMIN");
    expect(formatError(error)).toContain("MEMBER");
  });
});

describe("httpStatus", () => {
  it("INVALID_TRANSITION\u306f422\u3092\u8fd4\u3059", () => {
    expect(
      httpStatus({
        type: "INVALID_TRANSITION",
        from: "DRAFT",
        to: "X",
        available: [],
      }),
    ).toBe(422);
  });

  it("INSUFFICIENT_MEMBERS\u306f422\u3092\u8fd4\u3059", () => {
    expect(
      httpStatus({ type: "INSUFFICIENT_MEMBERS", actual: 5, required: 9 }),
    ).toBe(422);
  });

  it("MISSING_OPPONENT\u306f422\u3092\u8fd4\u3059", () => {
    expect(httpStatus({ type: "MISSING_OPPONENT", gameType: "FRIENDLY" })).toBe(
      422,
    );
  });

  it("GROUND_NOT_CONFIRMED\u306f422\u3092\u8fd4\u3059", () => {
    expect(httpStatus({ type: "GROUND_NOT_CONFIRMED" })).toBe(422);
  });

  it("DEADLINE_NOT_REACHED\u306f422\u3092\u8fd4\u3059", () => {
    expect(
      httpStatus({ type: "DEADLINE_NOT_REACHED", responded: 5, total: 15 }),
    ).toBe(422);
  });

  it("VALIDATION_ERROR\u306f400\u3092\u8fd4\u3059", () => {
    expect(httpStatus({ type: "VALIDATION_ERROR", issues: [] })).toBe(400);
  });

  it("DATABASE_ERROR\u306f500\u3092\u8fd4\u3059", () => {
    expect(httpStatus({ type: "DATABASE_ERROR", message: "x" })).toBe(500);
  });

  it("NOT_FOUND\u306f404\u3092\u8fd4\u3059", () => {
    expect(httpStatus({ type: "NOT_FOUND", entity: "x", id: "y" })).toBe(404);
  });

  it("CONFLICTは409を返す", () => {
    expect(
      httpStatus({ type: "CONFLICT", entity: "game", message: "更新競合" }),
    ).toBe(409);
  });

  it("EXTERNAL_SERVICE_ERRORは502を返す", () => {
    expect(
      httpStatus({
        type: "EXTERNAL_SERVICE_ERROR",
        service: "LINE",
        message: "timeout",
        retryable: true,
      }),
    ).toBe(502);
  });

  it("AUTHORIZATION_ERRORは403を返す", () => {
    expect(
      httpStatus({
        type: "AUTHORIZATION_ERROR",
        requiredRole: "ADMIN",
        actualRole: "MEMBER",
      }),
    ).toBe(403);
  });
});
