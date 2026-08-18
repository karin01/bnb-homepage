"use client";

import { PageHero } from "@/components/ui/PageHero";
import { useMembership } from "@/components/providers/MembershipProvider";
import { SITE } from "@/data/site";
import { formatLectureWhen } from "@/data/schedule";
import { type RegisteredSubject } from "@/data/subjects";
import { useLectures } from "@/hooks/useLectures";
import { listClubSubjects } from "@/lib/subjects";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function LabsPage() {
  const { isAdmin } = useMembership();
  const { lectures } = useLectures();
  const [clubs, setClubs] = useState<RegisteredSubject[]>([]);
  const [joined, setJoined] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const nextClubs = await listClubSubjects();
        if (!cancelled) {
          setClubs(nextClubs);
        }
      } catch {
        if (!cancelled) {
          setClubs([]);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const lecturesBySubject = useMemo(() => {
    const grouped = new Map<string, string>();
    lectures
      .filter((lecture) => lecture.grade === "club")
      .forEach((lecture) => {
        const label = `${formatLectureWhen(lecture)} · ${lecture.room}`;
        grouped.set(lecture.subject, grouped.has(lecture.subject) ? `${grouped.get(lecture.subject)} / ${label}` : label);
      });
    return grouped;
  }, [lectures]);

  return (
    <>
      <PageHero
        eyebrow="Community Labs"
        title="관심사로 모이는 소모임"
        description="AI 활용, C언어, 홈페이지 제작, 정보처리기사, 보드게임까지. 정규 강의 밖에서 속도를 붙입니다."
      />
      {isAdmin ? (
        <div className="mx-auto flex max-w-6xl justify-end px-5 pt-6">
          <Link href="/admin/labs" className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950">
            소모임 관리
          </Link>
        </div>
      ) : null}
      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-16 md:grid-cols-2">
        {clubs.map((club) => (
          <article key={`${club.id}-${club.name}`} className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{club.name}</h2>
              <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs text-cyan-700 dark:text-cyan-glow">
                {club.status ?? "안내 예정"}
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{club.summary ?? "소개 글이 곧 올라옵니다."}</p>
            <p className="mt-3 text-sm">
              {lecturesBySubject.get(club.name) ?? "일정 미정"} · {club.capacity ?? "정원 미정"}
            </p>
            <a
              href={SITE.kakaoChatUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setJoined(club.id)}
              className="mt-5 inline-flex rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950"
            >
              참여 신청
            </a>
            {joined === club.id ? (
              <p className="mt-3 text-sm text-[var(--text-muted)]">카카오채널로 이동합니다. 운영진이 참여 방법을 안내합니다.</p>
            ) : null}
          </article>
        ))}
      </section>
    </>
  );
}
