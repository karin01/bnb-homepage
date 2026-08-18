import { PageHero } from "@/components/ui/PageHero";
import { HISTORY_HIGHLIGHTS } from "@/data/content";

export default function HistoryPage() {
  return (
    <>
      <PageHero
        eyebrow="History"
        title="1990년부터 이어 온 걸어온 길"
        description="성동구 스터디와 파랑새 스터디의 연합으로 시작했습니다. 우수스터디 수상, 실습실 조성, 자격증반 합격 전통이 지금까지 이어집니다."
      />
      <section className="mx-auto max-w-3xl px-5 py-16">
        <ol className="relative border-l border-[var(--line)] pl-6">
          {HISTORY_HIGHLIGHTS.map((item) => (
            <li key={item.year} className="mb-10">
              <span className="absolute -left-2 mt-1 h-4 w-4 rounded-full bg-cyan-500" />
              <p className="font-mono text-sm text-cyan-700 dark:text-cyan-glow">{item.year}</p>
              <h2 className="mt-1 text-xl font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{item.detail}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
