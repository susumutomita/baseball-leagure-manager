/**
 * PayPay 決済リンク生成
 *
 * PayPay には公式の公開APIがないため、
 * プレースホルダーURLを生成する。
 * 将来的に PayPay API が利用可能になった場合はこのモジュールを差し替える。
 */

const PAYPAY_BASE_URL = "https://pay.paypay.ne.jp/request";

/**
 * PayPay 支払いリクエストURLを生成する
 * @param amount - 支払い金額（円）
 * @param description - 支払い説明文
 * @returns PayPay ディープリンクURL
 */
export function generatePayPayLink(
  amount: number,
  description: string,
): string {
  const url = new URL(PAYPAY_BASE_URL);
  url.searchParams.set("amount", String(amount));
  url.searchParams.set("description", description);
  return url.toString();
}
