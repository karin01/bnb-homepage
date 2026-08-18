/** 회원 역할은 이 파일에서만 정의합니다. 화면에서 숫자를 직접 올리지 않습니다. */
export const MEMBER_ROLES = ["site", "study", "admin"] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];

export const ROLE_LABELS: Record<MemberRole, string> = {
  site: "홈페이지 회원",
  study: "정회원",
  admin: "운영진",
};

/** 운영진이 등급을 고를 때 보는 짧은 설명 */
export const ROLE_HINTS: Record<MemberRole, string> = {
  site: "홈페이지 가입만 된 상태. 신편입생 게시판 등 공개 칸만 봅니다.",
  study: "입회·회비가 확인된 상태. 라운지·갤러리·자료실이 열립니다.",
  admin: "운영 관리까지 할 수 있습니다.",
};

export function isMemberRole(value: string): value is MemberRole {
  return MEMBER_ROLES.includes(value as MemberRole);
}

/** 회비가 확인된 정회원·운영진만 유료 자료(자료실·내부 게시판)를 봅니다. */
export function canUsePaidContent(role: MemberRole | null) {
  return role === "study" || role === "admin";
}

export function canUseResourceArchive(role: MemberRole | null) {
  return canUsePaidContent(role);
}

export function canOpenAdmin(role: MemberRole | null, email: string, emailVerified: boolean) {
  if (role === "admin") {
    return true;
  }

  const bootstrapEmail = process.env.NEXT_PUBLIC_BOOTSTRAP_ADMIN_EMAIL ?? "jungwon1023@gmail.com";
  return emailVerified && email.trim().toLowerCase() === bootstrapEmail.toLowerCase();
}
