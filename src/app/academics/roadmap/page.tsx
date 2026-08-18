import { PageHero } from "@/components/ui/PageHero";
import { ROADMAP } from "@/data/content";

export default function RoadmapPage() {
  return (
    <>
      <PageHero
        eyebrow="Roadmap"
        title="비전공자를 위한 학점 · 자격증 테크트리"
        description="1학년 입문부터 4학년 실무 연결까지, 방통대 컴과 커리큘럼을 BnB 방식으로 다시 배열했습니다."
      />
      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-16 md:grid-cols-2">
        {ROADMAP.map((stage) => (
          <article key={stage.stage} className="glass-card rounded-3xl p-6">
            <h2 className="text-xl font-semibold">{stage.stage}</h2>
            <ul className="mt-4 grid gap-2 text-sm leading-7 text-[var(--text-muted)]">
              {stage.items.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </>
  );
}
