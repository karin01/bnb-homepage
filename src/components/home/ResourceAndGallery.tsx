import { GALLERY_ITEMS } from "@/data/content";
import { GRADE_ROOMS, resourceBoardPath } from "@/data/resources";
import Link from "next/link";

export function ResourceAndGallery() {
  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-5 py-12 md:grid-cols-2">
      <div className="glass-card rounded-3xl p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">학년별 자료실 퀵 링크</h2>
          <Link href="/academics/resources" className="text-sm text-cyan-700 dark:text-cyan-glow">
            전체 보기
          </Link>
        </div>
        <div className="grid gap-3">
          {GRADE_ROOMS.map((room) => (
            <Link
              key={room.grade}
              href={resourceBoardPath(room.grade)}
              className="rounded-2xl border border-[var(--line)] p-4 hover:border-cyan-500/40"
            >
              <p className="font-medium">{room.title}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{room.subjects.join(" · ")}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">최근 활동 갤러리</h2>
          <Link href="/community/gallery" className="text-sm text-cyan-700 dark:text-cyan-glow">
            더보기
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {GALLERY_ITEMS.slice(0, 4).map((item) => (
            <article key={item.id} className={`min-h-36 rounded-2xl bg-linear-to-br ${item.tone} p-4 text-white`}>
              <p className="text-xs opacity-80">{item.date}</p>
              <p className="mt-8 text-sm font-medium">{item.title}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
