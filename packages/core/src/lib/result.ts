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
  | NotFoundErr
  | ConflictErr
  | ExternalServiceErr
  | AuthorizationErr;

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

export interface ConflictErr {
  readonly type: "CONFLICT";
  readonly entity: string;
  readonly message: string;
}

export interface ExternalServiceErr {
  readonly type: "EXTERNAL_SERVICE_ERROR";
  readonly service: string;
  readonly message: string;
  readonly retryable: boolean;
}

export interface AuthorizationErr {
  readonly type: "AUTHORIZATION_ERROR";
  readonly requiredRole: string;
  readonly actualRole: string;
}

export function formatError(error: AppError): string {
  switch (error.type) {
    case "INVALID_TRANSITION":
      return `状態遷移が不正です: ${error.from} → ${error.to}`;
    case "INSUFFICIENT_MEMBERS":
      return `参加可能人数が不足しています (${error.actual}/${error.required})`;
    case "MISSING_OPPONENT":
      return "承諾済みの対戦相手がいません";
    case "GROUND_NOT_CONFIRMED":
      return "グラウンドが未確保です";
    case "DEADLINE_NOT_REACHED":
      return `未回答者がいます (${error.responded}/${error.total})。締切前です`;
    case "VALIDATION_ERROR":
      return error.issues.map((i) => `${i.path}: ${i.message}`).join(", ");
    case "DATABASE_ERROR":
      return `データベースエラー: ${error.message}`;
    case "NOT_FOUND":
      return `${error.entity} が見つかりません (id: ${error.id})`;
    case "CONFLICT":
      return `${error.entity}: ${error.message}`;
    case "EXTERNAL_SERVICE_ERROR":
      return `外部サービスエラー (${error.service}): ${error.message}`;
    case "AUTHORIZATION_ERROR":
      return `権限が不足しています (必要: ${error.requiredRole}, 現在: ${error.actualRole})`;
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
    case "CONFLICT":
      return 409;
    case "EXTERNAL_SERVICE_ERROR":
      return 502;
    case "AUTHORIZATION_ERROR":
      return 403;
  }
}
