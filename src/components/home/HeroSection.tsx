import { SITE } from "@/data/site";
import { ArrowRight, MessageCircle } from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="hero-glow relative overflow-hidden border-b border-[var(--line)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.2fr_0.8fr] md:py-24">
        <div className="rise">
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-xs text-cyan-700 dark:text-cyan-glow">
            {SITE.semesterLabel} · {SITE.currentCohort}기 모집
          </p>
          <h1 className="mt-6 text-4xl leading-tight font-semibold tracking-tight md:text-6xl">
            하나의 Bit가 모여
            <br />
            더 큰 Byte를 만듭니다
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-[var(--text-muted)]">
            한국방송통신대학교 컴퓨터과학과 No.1 스터디그룹. 1990년부터 혜화동에서 전공 강의, 자료실, 소모임, 선후배의 연결을 이어 왔습니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/join/apply"
              className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-navy-950"
            >
              스터디 가입 신청하기
              <ArrowRight size={16} />
            </Link>
            <a
              href={SITE.kakaoChatUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold"
            >
              <MessageCircle size={16} />
              1:1 카카오톡 상담
            </a>
          </div>
        </div>

        <div className="glass-card rise rounded-3xl p-6">
          <p className="font-mono text-xs tracking-[0.2em] text-cyan-600 uppercase dark:text-cyan-glow">Live semester</p>
          <p className="mt-3 text-2xl font-semibold">지금 진행 중인 학기</p>
          <dl className="mt-6 grid gap-4 text-sm">
            <div className="flex justify-between border-b border-[var(--line)] pb-3">
              <dt className="text-[var(--text-muted)]">학기</dt>
              <dd>{SITE.semesterLabel}</dd>
            </div>
            <div className="flex justify-between border-b border-[var(--line)] pb-3">
              <dt className="text-[var(--text-muted)]">기수</dt>
              <dd>{SITE.currentCohort}기 신·편입생</dd>
            </div>
            <div className="flex justify-between border-b border-[var(--line)] pb-3">
              <dt className="text-[var(--text-muted)]">아지트</dt>
              <dd>{SITE.locationLabel}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-muted)]">전통</dt>
              <dd>{SITE.establishedYear}년 창설 · {new Date().getFullYear() - SITE.establishedYear}년</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
