import { PageHero } from "@/components/ui/PageHero";
import Link from "next/link";

export default function SignupCompletePage() {
  return (
    <>
      <PageHero
        eyebrow="Welcome"
        title="홈페이지 가입이 완료되었습니다"
        description="지금은 홈페이지 회원입니다. 신편입생 게시판은 바로 쓸 수 있지만, 라운지·갤러리·자료실은 입회와 회비가 확인된 뒤 정회원이 되어야 열립니다."
      />
      <section className="mx-auto max-w-xl px-5 py-16">
        <div className="glass-card rounded-3xl p-6">
          <div className="flex flex-col gap-3">
            <Link href="/community/qa" className="rounded-full bg-cyan-500 px-4 py-3 text-center text-sm font-semibold text-navy-950">
              신편입생 게시판 보기
            </Link>
            <Link href="/join/apply" className="rounded-full border border-[var(--line)] px-4 py-3 text-center text-sm font-semibold">
              이어서 스터디 입회하기
            </Link>
            <Link href="/" className="text-center text-sm text-[var(--text-muted)]">
              메인으로
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
