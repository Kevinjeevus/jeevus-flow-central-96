const KEY = "transaction_number_padding";
export const DEFAULT_PADDING = 2;

export function getNumberPadding(): number {
  if (typeof window === "undefined") return DEFAULT_PADDING;
  const v = parseInt(localStorage.getItem(KEY) || "", 10);
  if (Number.isNaN(v) || v < 1 || v > 10) return DEFAULT_PADDING;
  return v;
}

export function setNumberPadding(n: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, String(n));
}

export function padNumber(n: number, length = getNumberPadding()): string {
  return n.toString().padStart(length, "0");
}
