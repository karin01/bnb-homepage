import { PageHero } from "@/components/ui/PageHero";
import { BENEFITS } from "@/data/content";
import { SITE } from "@/data/site";
import Link from "next/link";

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="하나의 BIT가 모여 보다 큰 BYTE를 만든다"
        description="학습 정보는 물론, 선후배 우정을 흠씬 느낄 수 있는 스터디입니다. 과목 분담 강의로 효율을 극대화하고, 동문 선배 특강으로 시야를 넓힙니다."
      />
      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-12 md:grid-cols-3">
        <article className="glass-card rounded-3xl p-6 md:col-span-2">
          <h2 className="text-xl font-semibold">학습 방법</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            1명 또는 2명이 한 과목을 맡아 정해진 시간표로 강의합니다. 스스로 가르친다고 생각하고 준비하는 방식이, 방송강의를 혼자 듣는 것보다 훨씬 오래 남습니다.
          </p>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            일부 교과목과 프로그래밍 언어는 매해 필요에 따라 동문 선배 특강으로 보강합니다. 올해는 {SITE.currentCohort}기 신·편입생을 맞이합니다.
          </p>
        </article>
        <article className="glass-card rounded-3xl p-6">
          <h2 className="text-xl font-semibold">바로가기</h2>
          <div className="mt-4 grid gap-2 text-sm">
            <Link href="/about/history">걸어온 길</Link>
            <Link href="/about/room">우리 아지트</Link>
            <Link href="/about/rules">스터디 회칙</Link>
            <Link href="/join">입회 안내</Link>
          </div>
        </article>
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="mb-6 text-2xl font-semibold">매력 포인트</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {BENEFITS.map((benefit, index) => (
            <article key={benefit.title} className="glass-card rounded-2xl p-5">
              <p className="font-mono text-xs text-cyan-700 dark:text-cyan-glow">{String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 font-semibold">{benefit.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{benefit.description}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
