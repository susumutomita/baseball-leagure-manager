export interface NextAction {
  readonly action: string;
  readonly reason: string;
  readonly priority: "high" | "medium" | "low";
  readonly suggested_params?: Record<string, unknown>;
}

export interface ApiSuccessResponse<T> {
  readonly data: T;
  readonly meta?: Record<string, unknown>;
  readonly next_actions: readonly NextAction[];
}

export interface ApiErrorResponse {
  readonly error: string;
  readonly error_code: string;
  readonly next_actions: readonly NextAction[];
  readonly [key: string]: unknown;
}

export function apiSuccess<T>(
  data: T,
  nextActions: readonly NextAction[] = [],
  meta?: Record<string, unknown>,
): ApiSuccessResponse<T> {
  return { data, meta, next_actions: nextActions };
}

export function apiError(
  code: string,
  message: string,
  nextActions: readonly NextAction[] = [],
  extra?: Record<string, unknown>,
): ApiErrorResponse {
  return {
    error: message,
    error_code: code,
    next_actions: nextActions,
    ...extra,
  };
}
