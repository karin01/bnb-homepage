import { SectionHeading } from "@/components/ui/SectionHeading";
import { BENEFITS } from "@/data/content";

export function BenefitGrid() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-8 md:py-12">
      <SectionHeading
        eyebrow="Why BnB"
        title="Bit & Byte 핵심 혜택"
        description="신·편입생에게는 입회의 이유를, 정회원에게는 매주 돌아오는 이유를 분명히 보여 줍니다."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {BENEFITS.map((benefit) => (
          <article key={benefit.title} className="glass-card rounded-2xl p-5">
            <h3 className="text-base font-semibold">{benefit.title}</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{benefit.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
