export const DEV_LOGIN_PREFIX = "dev-login:";

export function isDevLoginEnabled() {
  return process.env.NODE_ENV !== "production";
}

export function getDevLineUserId(memberId: string) {
  return `${DEV_LOGIN_PREFIX}${memberId}`;
}
