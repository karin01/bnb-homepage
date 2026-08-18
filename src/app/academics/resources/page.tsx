"use client";

import { ArchiveRoomNav } from "@/components/resources/ArchiveRoomNav";
import { ResourceFileList } from "@/components/resources/ResourceFileList";
import { PageHero } from "@/components/ui/PageHero";
import { useMembership } from "@/components/providers/MembershipProvider";
import { ARCHIVE_HUB_PATH, parseArchiveRoomId } from "@/data/resources";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

/** 예전 ?grade=1 주소는 새 게시판 주소로 보냅니다. */
function LegacyArchiveRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const gradeQuery = searchParams.get("grade");
    if (!gradeQuery) {
      return;
    }
    const room = parseArchiveRoomId(gradeQuery);
    if (room) {
      router.replace(`${ARCHIVE_HUB_PATH}/${room}`);
    }
  }, [router, searchParams]);

  return null;
}

export default function ResourcesPage() {
  const { isAdmin } = useMembership();

  return (
    <>
      <Suspense fallback={null}>
        <LegacyArchiveRedirect />
      </Suspense>
      <PageHero
        eyebrow="Archive"
        title="연도 · 학기 · 과목 태그로 찾는 자료실"
        description="학년 방을 누르면 그 게시판으로 들어갑니다. 모든 방에서 쉐어노트를 올릴 수 있고, 1~4학년에는 운영진 자료도 같이 보입니다."
      />
      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">자료실 방을 골라 입장해 주세요.</p>
          {isAdmin ? (
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/resources" className="text-sm font-semibold text-cyan-700 dark:text-cyan-glow">
                자료 올리기
              </Link>
              <Link href="/admin/share-notes" className="text-sm font-semibold text-cyan-700 dark:text-cyan-glow">
                쉐어노트 관리
              </Link>
            </div>
          ) : null}
        </div>
        <ArchiveRoomNav activeRoom="all" />
        <ResourceFileList grade="all" />
      </section>
    </>
  );
}
