import { PageHero } from "@/components/ui/PageHero";
import { RULES_CHAPTERS, RULES_INTRO, RULES_REVISIONS, RULES_TITLE } from "@/data/rules";

export default function RulesPage() {
  return (
    <>
      <PageHero
        eyebrow="Rules"
        title={RULES_TITLE}
        description={RULES_INTRO.join(" ")}
      />
      <section className="mx-auto max-w-3xl px-5 py-16">
        <div className="grid gap-6">
          {RULES_CHAPTERS.map((chapter) => (
            <article key={chapter.title} className="glass-card rounded-3xl p-6 md:p-8">
              <p className="inline-flex rounded-full bg-cyan-500 px-3 py-1 text-xs font-semibold text-navy-950">
                {chapter.title}
              </p>
              <div className="mt-6 grid gap-6">
                {chapter.articles.map((article) => (
                  <div key={article.title}>
                    <h2 className="font-semibold">{article.title}</h2>
                    {article.lead ? (
                      <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{article.lead}</p>
                    ) : null}
                    {article.clauses?.map((clause) => (
                      <div key={clause.title} className="mt-3">
                        <p className="text-sm font-medium">ㆍ {clause.title}</p>
                        {clause.paragraphs.map((paragraph) => (
                          <p key={paragraph} className="mt-1 text-sm leading-7 text-[var(--text-muted)]">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </article>
          ))}
          <article className="glass-card rounded-3xl p-6 md:p-8">
            <h2 className="font-semibold">개정 연혁</h2>
            <ul className="mt-4 grid gap-1 text-sm leading-7 text-[var(--text-muted)]">
              {RULES_REVISIONS.map((revision) => (
                <li key={revision}>{revision}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </>
  );
}
