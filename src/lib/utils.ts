export function cn(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function formatWon(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}
