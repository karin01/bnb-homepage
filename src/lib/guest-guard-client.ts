import { withBasePath } from "@/lib/site-path";

export type GuestGuardAction = "post" | "comment";

/** 비가입자 글·댓글을 저장하기 전에 서버에서 IP를 검사합니다. */
export async function assertGuestAccess(action: GuestGuardAction) {
  let response: Response;
  try {
    response = await fetch(withBasePath("/api/guest-guard"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  } catch {
    throw new Error("공개 웹에서는 비회원 글쓰기를 막습니다. 가입 후 글을 남겨 주세요.");
  }

  if (response.status === 404 || response.status === 405) {
    throw new Error("공개 웹에서는 비회원 글쓰기를 막습니다. 가입 후 글을 남겨 주세요.");
  }

  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  if (response.ok) {
    return;
  }

  throw new Error(payload?.message?.trim() || "지금은 글을 받을 수 없습니다. 잠시 후 다시 시도해 주세요.");
}
