// ============================================================
// API ハンドラーユーティリティ — 共通エラーハンドリング・レスポンス整形
// ============================================================
import type { z } from "zod/v4";
import type { AppError } from "./result";
import { formatError, httpStatus } from "./result";
import { zodToValidationError } from "./validators";

/** API ハンドラーの実行結果 */
export type HandlerResult<T> =
  | { success: true; data: T; status?: number }
  | { success: false; error: AppError; status: number };

/**
 * Zod スキーマでリクエストボディをパースする
 * パース失敗時は ValidationErr を返す
 */
export function parseBody<T>(
  schema: z.ZodType<T>,
  body: unknown,
): HandlerResult<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    const validationError = zodToValidationError(result.error);
    return {
      success: false,
      error: validationError,
      status: httpStatus(validationError),
    };
  }
  return { success: true, data: result.data };
}

/**
 * AppError を JSON レスポンス形式に変換する
 */
export function errorResponse(error: AppError): {
  error: { type: string; message: string };
  status: number;
} {
  return {
    error: {
      type: error.type,
      message: formatError(error),
    },
    status: httpStatus(error),
  };
}

/**
 * NotFound エラーを生成する
 */
export function notFound(entity: string, id: string): HandlerResult<never> {
  const error: AppError = { type: "NOT_FOUND", entity, id };
  return { success: false, error, status: 404 };
}

/**
 * Authorization エラーを生成する
 */
export function unauthorized(
  requiredRole: string,
  actualRole: string,
): HandlerResult<never> {
  const error: AppError = {
    type: "AUTHORIZATION_ERROR",
    requiredRole,
    actualRole,
  };
  return { success: false, error, status: 403 };
}

/**
 * Conflict エラーを生成する
 */
export function conflict(
  entity: string,
  message: string,
): HandlerResult<never> {
  const error: AppError = { type: "CONFLICT", entity, message };
  return { success: false, error, status: 409 };
}
