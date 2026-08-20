"use client";

import { listMembers } from "@/lib/accounts";
import { displayCohort, formatCohort } from "@/data/cohort";
import { listLectures } from "@/lib/lectures";
import { ROLE_LABELS, type MemberRole } from "@/lib/member-roles";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminHomePage() {
  const [memberCount, setMemberCount] = useState(0);
  const [roleCounts, setRoleCounts] = useState<Record<MemberRole, number>>({
    site: 0,
    study: 0,
    admin: 0,
  });
  const [lectureCount, setLectureCount] = useState(0);
  const [recentNames, setRecentNames] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [members, lectures] = await Promise.all([listMembers(), listLectures()]);
        const nextCounts: Record<MemberRole, number> = { site: 0, study: 0, admin: 0 };
        members.forEach((member) => {
          nextCounts[member.role] += 1;
        });
        setMemberCount(members.length);
        setRoleCounts(nextCounts);
        setLectureCount(lectures.length);
        setRecentNames(members.slice(0, 5).map((member) => `${member.name} · ${formatCohort(displayCohort(member.grade, member.cohort))} (${member.loginId})`));
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "관리 데이터를 불러오지 못했습니다.");
      }
    };

    void loadDashboard();
  }, []);

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold">운영 한눈에 보기</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          홈페이지 가입은 Firestore `members`에 쌓입니다. 입회원서와 회비가 확인되면 회원 관리에서 정회원으로 올리세요. 홈페이지 회원만으로는 라운지·자료실이 열리지 않습니다.
        </p>
      </div>
      {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
      <div className="grid gap-3 md:grid-cols-4">
        <article className="glass-card rounded-2xl p-4">
          <p className="text-sm text-[var(--text-muted)]">전체 가입</p>
          <p className="mt-2 text-2xl font-semibold">{memberCount}</p>
        </article>
        <article className="glass-card rounded-2xl p-4">
          <p className="text-sm text-[var(--text-muted)]">{ROLE_LABELS.site}</p>
          <p className="mt-2 text-2xl font-semibold">{roleCounts.site}</p>
        </article>
        <article className="glass-card rounded-2xl p-4">
          <p className="text-sm text-[var(--text-muted)]">{ROLE_LABELS.study}</p>
          <p className="mt-2 text-2xl font-semibold">{roleCounts.study}</p>
        </article>
        <article className="glass-card rounded-2xl p-4">
          <p className="text-sm text-[var(--text-muted)]">등록 강의</p>
          <p className="mt-2 text-2xl font-semibold">{lectureCount}</p>
        </article>
      </div>
      <article className="glass-card rounded-3xl p-5">
        <h2 className="font-semibold">최근 가입</h2>
        {recentNames.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">아직 서버에 저장된 가입자가 없습니다.</p>
        ) : (
          <ul className="mt-3 grid gap-2 text-sm">
            {recentNames.map((name) => (
              <li key={name} className="rounded-xl border border-[var(--line)] px-3 py-2">
                {name}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/admin/members" className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950">
            회원 등업하기
          </Link>
          <Link href="/admin/boards" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            게시판 관리
          </Link>
          <Link href="/admin/schedule" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            수업 시간표·과목 수정
          </Link>
          <Link href="/admin/labs" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            소모임 관리
          </Link>
          <Link href="/admin/calendar" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            학사 일정
          </Link>
          <Link href="/admin/notices" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            팝업 공지
          </Link>
          <Link href="/admin/resources" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            자료 올리기
          </Link>
          <Link href="/admin/share-notes" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            쉐어노트 관리
          </Link>
          <Link href="/admin/security" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            접속 보안
          </Link>
        </div>
      </article>
    </div>
  );
}
