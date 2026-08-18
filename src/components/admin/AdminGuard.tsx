"use client";

import { useMembership } from "@/components/providers/MembershipProvider";
import { BOOTSTRAP_ADMIN_EMAIL } from "@/lib/firebase";
import { listBoardsOrSeed } from "@/lib/boards";
import { ensureGuestAccessSettings } from "@/lib/security-settings";
import Link from "next/link";
import { useEffect } from "react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { status, isAdmin, email, emailVerified } = useMembership();

  useEffect(() => {
    if (!isAdmin) return;
    void Promise.all([listBoardsOrSeed(), ensureGuestAccessSettings()]).catch(() => {
      // 기본 게시판·보안 설정이 없어도 관리 화면은 열리게 둡니다.
    });
  }, [isAdmin]);

  if (status === "loading") {
    return <p className="text-sm text-[var(--text-muted)]">운영진 권한을 확인하는 중입니다.</p>;
  }

  if (!isAdmin) {
    const needsVerification = email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() && !emailVerified;
    return (
      <div className="glass-card rounded-3xl p-6">
        <h1 className="text-xl font-semibold">관리 페이지는 운영진만 들어갈 수 있습니다</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
          {needsVerification
            ? "첫 운영진 이메일의 인증 링크를 먼저 확인해 주세요. 메일함의 인증 메일을 열면 관리창이 열립니다."
            : "회원 등업과 수업 변경은 운영진 권한이 있는 계정으로만 할 수 있습니다."}
        </p>
        <Link href="/" className="mt-5 inline-block text-sm font-semibold text-cyan-700 dark:text-cyan-glow">
          메인으로 돌아가기
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
