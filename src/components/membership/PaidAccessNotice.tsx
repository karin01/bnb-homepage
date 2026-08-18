"use client";

import { useMembership } from "@/components/providers/MembershipProvider";
import Link from "next/link";

/** 홈페이지 가입만 한 사람에게, 정회원이 되어야 열리는 칸을 안내합니다. */
export function PaidAccessNotice() {
  const { uid, role } = useMembership();
  const isHomepageOnly = Boolean(uid) && role === "site";

  return (
    <div className="glass-card rounded-3xl p-5">
      <p className="font-medium">정회원만 볼 수 있습니다</p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
        홈페이지 가입만으로는 라운지·갤러리·자료실이 열리지 않습니다. 입회원서를 내고 회비가 확인되면, 운영진이 회원 관리에서{" "}
        <strong>정회원</strong>으로 올립니다.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {!uid ? (
          <Link href="/login" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            로그인
          </Link>
        ) : null}
        {isHomepageOnly || !uid ? (
          <Link href="/join/apply" className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950">
            입회신청
          </Link>
        ) : null}
      </div>
    </div>
  );
}
