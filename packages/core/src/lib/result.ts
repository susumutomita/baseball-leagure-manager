// ============================================================
// Result 型 — 例外を使わない型安全なエラーハンドリング
// ============================================================

export type Result<T, E = AppError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export type AppError =
  | InvalidTransitionErr
  | InsufficientMembersErr
  | MissingOpponentErr
  | GroundNotConfirmedErr
  | DeadlineNotReachedErr
  | ValidationErr
  | DatabaseErr
  | NotFoundErr;

export interface InvalidTransitionErr {
  readonly type: "INVALID_TRANSITION";
  readonly from: string;
  readonly to: string;
  readonly available: string[];
}

export interface InsufficientMembersErr {
  readonly type: "INSUFFICIENT_MEMBERS";
  readonly actual: number;
  readonly required: number;
}

export interface MissingOpponentErr {
  readonly type: "MISSING_OPPONENT";
  readonly gameType: string;
}

export interface GroundNotConfirmedErr {
  readonly type: "GROUND_NOT_CONFIRMED";
}

export interface DeadlineNotReachedErr {
  readonly type: "DEADLINE_NOT_REACHED";
  readonly responded: number;
  readonly total: number;
}

export interface ValidationErr {
  readonly type: "VALIDATION_ERROR";
  readonly issues: ReadonlyArray<{ path: string; message: string }>;
}

export interface DatabaseErr {
  readonly type: "DATABASE_ERROR";
  readonly message: string;
  readonly code?: string;
}

export interface NotFoundErr {
  readonly type: "NOT_FOUND";
  readonly entity: string;
  readonly id: string;
}

export function formatError(error: AppError): string {
  switch (error.type) {
    case "INVALID_TRANSITION":
      return `\u72b6\u614b\u9077\u79fb\u304c\u4e0d\u6b63\u3067\u3059: ${error.from} \u2192 ${error.to}`;
    case "INSUFFICIENT_MEMBERS":
      return `\u53c2\u52a0\u53ef\u80fd\u4eba\u6570\u304c\u4e0d\u8db3\u3057\u3066\u3044\u307e\u3059 (${error.actual}/${error.required})`;
    case "MISSING_OPPONENT":
      return "\u627f\u8afe\u6e08\u307f\u306e\u5bfe\u6226\u76f8\u624b\u304c\u3044\u307e\u305b\u3093";
    case "GROUND_NOT_CONFIRMED":
      return "\u30b0\u30e9\u30a6\u30f3\u30c9\u304c\u672a\u78ba\u4fdd\u3067\u3059";
    case "DEADLINE_NOT_REACHED":
      return `\u672a\u56de\u7b54\u8005\u304c\u3044\u307e\u3059 (${error.responded}/${error.total})\u3002\u7de0\u5207\u524d\u3067\u3059`;
    case "VALIDATION_ERROR":
      return error.issues.map((i) => `${i.path}: ${i.message}`).join(", ");
    case "DATABASE_ERROR":
      return `\u30c7\u30fc\u30bf\u30d9\u30fc\u30b9\u30a8\u30e9\u30fc: ${error.message}`;
    case "NOT_FOUND":
      return `${error.entity} \u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093 (id: ${error.id})`;
  }
}

export function httpStatus(error: AppError): number {
  switch (error.type) {
    case "INVALID_TRANSITION":
      return 422;
    case "INSUFFICIENT_MEMBERS":
    case "MISSING_OPPONENT":
    case "GROUND_NOT_CONFIRMED":
    case "DEADLINE_NOT_REACHED":
      return 422;
    case "VALIDATION_ERROR":
      return 400;
    case "DATABASE_ERROR":
      return 500;
    case "NOT_FOUND":
      return 404;
  }
}
