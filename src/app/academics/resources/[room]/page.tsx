"use client";

import { ArchiveRoomNav } from "@/components/resources/ArchiveRoomNav";
import { ResourceFileList } from "@/components/resources/ResourceFileList";
import { ShareNotesBoard } from "@/components/resources/ShareNotesBoard";
import { PageHero } from "@/components/ui/PageHero";
import { useMembership } from "@/components/providers/MembershipProvider";
import { ARCHIVE_HUB_PATH, GRADE_ROOMS, parseArchiveRoomId } from "@/data/resources";
import { CLUB_ARCHIVE_ROOM } from "@/data/share-notes";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ResourceBoardPage() {
  const params = useParams<{ room: string }>();
  const { isAdmin } = useMembership();
  const room = parseArchiveRoomId(String(params.room ?? ""));

  if (!room) {
    return (
      <section className="mx-auto max-w-4xl px-5 py-16">
        <p className="text-sm text-[var(--text-muted)]">없는 자료실입니다.</p>
        <Link href={ARCHIVE_HUB_PATH} className="mt-4 inline-block text-sm font-semibold text-cyan-700 dark:text-cyan-glow">
          자료실로 돌아가기
        </Link>
      </section>
    );
  }

  const isClubRoom = room === "club";
  const gradeRoom = isClubRoom ? null : GRADE_ROOMS.find((item) => item.grade === room);
  const title = isClubRoom ? CLUB_ARCHIVE_ROOM.title : (gradeRoom?.title ?? "자료실");
  const description = isClubRoom ? CLUB_ARCHIVE_ROOM.summary : (gradeRoom?.summary ?? "");

  return (
    <>
      <PageHero eyebrow="Archive" title={title} description={description} />
      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href={ARCHIVE_HUB_PATH} className="text-sm font-semibold text-cyan-700 dark:text-cyan-glow">
            ← 자료실 전체
          </Link>
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
        <ArchiveRoomNav activeRoom={room} />
        {!isClubRoom ? (
          <div className="mt-8">
            <h2 className="text-lg font-semibold">운영진 자료</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">연도·학기·과목으로 올린 공식 자료입니다.</p>
            <ResourceFileList grade={room} />
          </div>
        ) : null}
        <div className="mt-10">
          <h2 className="text-lg font-semibold">쉐어노트</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            제목을 누르면 게시글처럼 열립니다. 그 안에서 공부하기, 다운로드, 노트 정리, 퀴즈를 쓸 수 있습니다.
          </p>
          <div className="mt-4">
            <ShareNotesBoard room={room} />
          </div>
        </div>
      </section>
    </>
  );
}
