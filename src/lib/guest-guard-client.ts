export type GuestGuardAction = "post" | "comment";

/** 비가입자 글·댓글을 저장하기 전에 서버에서 IP를 검사합니다. */
export async function assertGuestAccess(action: GuestGuardAction) {
  const response = await fetch("/api/guest-guard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });

  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  if (response.ok) {
    return;
  }

  throw new Error(payload?.message?.trim() || "지금은 글을 받을 수 없습니다. 잠시 후 다시 시도해 주세요.");
}
