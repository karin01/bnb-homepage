import { NOTICE_POSTS } from "@/data/content";

export function NoticeTicker() {
  const doubled = [...NOTICE_POSTS, ...NOTICE_POSTS];

  return (
    <div className="overflow-hidden border-b border-[var(--line)] bg-navy-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
        <span className="shrink-0 rounded-full bg-cyan-500 px-2 py-1 text-[11px] font-bold text-navy-950">
          실시간 공지
        </span>
        <div className="overflow-hidden">
          <div className="ticker-track flex w-max gap-10 text-sm">
            {doubled.map((post, index) => (
              <span key={`${post.id}-${index}`} className="whitespace-nowrap">
                {post.title}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
