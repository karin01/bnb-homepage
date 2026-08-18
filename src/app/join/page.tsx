import { PageHero } from "@/components/ui/PageHero";
import { KakaoChannelQr } from "@/components/ui/KakaoChannelQr";
import { formatWon } from "@/lib/utils";
import { SITE } from "@/data/site";
import Link from "next/link";

export default function JoinPage() {
  return (
    <>
      <PageHero
        eyebrow="Join Us"
        title="입회 안내"
        description="오픈수업을 들어 보고, 맞다 싶으면 입회원서를 남기면 됩니다. 회비와 환불 기준을 먼저 투명하게 공개합니다."
      />
      <section className="mx-auto grid max-w-6xl gap-4 px-5 pt-12 md:grid-cols-2">
        <article className="glass-card rounded-3xl p-6">
          <p className="text-xs font-mono tracking-[0.18em] text-cyan-700 uppercase dark:text-cyan-glow">Website</p>
          <h2 className="mt-2 text-xl font-semibold">1. 홈페이지 가입</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            아이디를 만들어 자료실과 게시판을 봅니다. 회비는 없습니다. 가입 전 질문은{" "}
            <Link href="/community/qa" className="font-semibold text-cyan-700 dark:text-cyan-glow">
              신편입생 게시판
            </Link>
            에 남길 수 있습니다.
          </p>
          <Link href="/signup" className="mt-5 inline-block rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            홈페이지 가입하기
          </Link>
        </article>
        <article className="glass-card rounded-3xl p-6">
          <p className="text-xs font-mono tracking-[0.18em] text-cyan-700 uppercase dark:text-cyan-glow">Study</p>
          <h2 className="mt-2 text-xl font-semibold">2. 스터디 입회</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            아지트 강의와 소모임에 참여하려면 입회원서와 회비가 필요합니다.
          </p>
          <Link href="/join/apply" className="mt-5 inline-block rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950">
            입회원서 작성하기
          </Link>
        </article>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-12 md:grid-cols-3">
        <article className="glass-card rounded-3xl p-6">
          <p className="text-sm text-[var(--text-muted)]">학기 회비</p>
          <p className="mt-2 text-3xl font-semibold">{formatWon(SITE.fee.semester)}</p>
          <p className="mt-3 text-sm text-[var(--text-muted)]">6개월 기준</p>
        </article>
        <article className="glass-card rounded-3xl p-6">
          <p className="text-sm text-[var(--text-muted)]">연납 할인</p>
          <p className="mt-2 text-3xl font-semibold">{formatWon(SITE.fee.year)}</p>
          <p className="mt-3 text-sm text-[var(--text-muted)]">12개월 일시납 시 2만 원 할인</p>
        </article>
        <article className="glass-card rounded-3xl p-6">
          <p className="text-sm text-[var(--text-muted)]">신입 가입비</p>
          <p className="mt-2 text-3xl font-semibold">{formatWon(SITE.fee.join)}</p>
          <p className="mt-3 text-sm text-[var(--text-muted)]">오픈강의 기간 환불 시 가입비는 제외</p>
        </article>
      </section>
      <KakaoChannelQr />
      <section className="mx-auto max-w-3xl px-5 pb-20">
        <div className="glass-card rounded-3xl p-6">
          <h2 className="text-xl font-semibold">입금 계좌</h2>
          <p className="mt-3 text-sm leading-7">
            {SITE.bank.bankName} {SITE.bank.accountNumber} · 예금주 {SITE.bank.holder}
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            입금과 함께 공식 입회원서를 제출해야 명단에 반영됩니다. 원서는 Bit&Byte 스터디 가입 구글폼으로만 받습니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/join/apply" className="rounded-full bg-cyan-500 px-5 py-2 text-sm font-semibold text-navy-950">
              입회원서 작성하기
            </Link>
            <a
              href={SITE.googleFormUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[var(--line)] px-5 py-2 text-sm"
            >
              구글폼 새 창에서 열기
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
