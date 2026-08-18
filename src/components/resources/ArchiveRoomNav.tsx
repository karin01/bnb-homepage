import { GRADE_ROOMS, resourceBoardPath, type ArchiveRoomId } from "@/data/resources";
import { CLUB_ARCHIVE_ROOM } from "@/data/share-notes";
import Link from "next/link";

type ArchiveRoomNavProps = {
  activeRoom?: ArchiveRoomId | "all";
};

/** 자료실 허브와 각 방 게시판에서 같은 카드로 이동합니다. */
export function ArchiveRoomNav({ activeRoom = "all" }: ArchiveRoomNavProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {GRADE_ROOMS.map((room) => (
        <Link
          key={room.grade}
          href={resourceBoardPath(room.grade)}
          className={`glass-card rounded-2xl p-4 text-left ${activeRoom === room.grade ? "ring-2 ring-cyan-400" : ""}`}
        >
          <p className="font-semibold">{room.title}</p>
          <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{room.summary}</p>
        </Link>
      ))}
      <Link
        href={resourceBoardPath(CLUB_ARCHIVE_ROOM.id)}
        className={`glass-card rounded-2xl p-4 text-left ${activeRoom === CLUB_ARCHIVE_ROOM.id ? "ring-2 ring-cyan-400" : ""}`}
      >
        <p className="font-semibold">{CLUB_ARCHIVE_ROOM.title}</p>
        <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{CLUB_ARCHIVE_ROOM.summary}</p>
      </Link>
    </div>
  );
}
