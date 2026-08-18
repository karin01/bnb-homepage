/** 회원 학년. 1~4학년, 편입, OB(졸업 선배)를 한곳에서만 정의합니다. */
export const MEMBER_GRADES = [
  { value: "1", label: "1학년" },
  { value: "2", label: "2학년" },
  { value: "3", label: "3학년" },
  { value: "4", label: "4학년" },
  { value: "transfer", label: "편입" },
  { value: "ob", label: "OB" },
] as const;

export type MemberGrade = (typeof MEMBER_GRADES)[number]["value"];

export function isMemberGrade(value: string): value is MemberGrade {
  return MEMBER_GRADES.some((item) => item.value === value);
}
