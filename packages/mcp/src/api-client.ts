// ============================================================
// REST API クライアント — MCP サーバーから REST API を呼び出す
// ============================================================

const BASE_URL = process.env.MOUND_API_BASE_URL ?? "http://localhost:3000";
const API_TOKEN = process.env.MOUND_API_TOKEN ?? "";

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (API_TOKEN) {
    headers.Authorization = `Bearer ${API_TOKEN}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const data = (await res.json().catch(() => null)) as T;

  return {
    ok: res.ok,
    status: res.status,
    data,
  };
}

// --- 便利メソッド ---

export function get<T = unknown>(path: string): Promise<ApiResponse<T>> {
  return request<T>("GET", path);
}

export function post<T = unknown>(
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  return request<T>("POST", path, body);
}

export function patch<T = unknown>(
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  return request<T>("PATCH", path, body);
}
