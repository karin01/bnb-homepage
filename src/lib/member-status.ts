/** 회원 상태는 이 파일에서만 정의합니다. Auth 계정을 지우지 않고 상태만 바꿉니다. */

export const MEMBER_STATUSES = ["active", "blocked", "withdrawn"] as const;

export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const STATUS_LABELS: Record<MemberStatus, string> = {
  active: "정상",
  blocked: "차단",
  withdrawn: "탈퇴",
};

export function isMemberStatus(value: string): value is MemberStatus {
  return MEMBER_STATUSES.includes(value as MemberStatus);
}

export function parseMemberStatus(value: unknown): MemberStatus {
  return isMemberStatus(String(value ?? "")) ? value as MemberStatus : "active";
}

export function canLoginWithStatus(status: MemberStatus) {
  return status === "active";
}
