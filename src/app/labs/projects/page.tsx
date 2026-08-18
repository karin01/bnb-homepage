import { PageHero } from "@/components/ui/PageHero";
import { PROJECTS } from "@/data/content";

export default function ProjectsPage() {
  return (
    <>
      <PageHero
        eyebrow="Showcase"
        title="소모임이 남긴 프로젝트 갤러리"
        description="홈페이지, AI 도구, 자료 아카이브처럼 학우가 실제로 만든 결과물을 모읍니다."
      />
      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-16 md:grid-cols-3">
        {PROJECTS.map((project) => (
          <article key={project.id} className="glass-card rounded-3xl p-6">
            <p className="font-mono text-xs text-cyan-700 dark:text-cyan-glow">{project.year}</p>
            <h2 className="mt-2 text-lg font-semibold">{project.title}</h2>
            <p className="mt-3 text-sm text-[var(--text-muted)]">{project.members}</p>
          </article>
        ))}
      </section>
    </>
  );
}
