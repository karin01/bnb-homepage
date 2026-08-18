import { PageHero } from "@/components/ui/PageHero";
import Link from "next/link";

export default function SignupCompletePage() {
  return (
    <>
      <PageHero
        eyebrow="Welcome"
        title="홈페이지 가입이 완료되었습니다"
        description="이제 로그인된 상태로 자료실을 볼 수 있습니다. 운영진이라면 메일함의 인증 링크를 확인한 뒤 `/admin`에서 회원을 관리하세요. 스터디 강의와 아지트 활동까지 참여하려면 입회원서를 따로 제출해 주세요."
      />
      <section className="mx-auto max-w-xl px-5 py-16">
        <div className="glass-card rounded-3xl p-6">
          <div className="flex flex-col gap-3">
            <Link href="/academics/resources" className="rounded-full bg-cyan-500 px-4 py-3 text-center text-sm font-semibold text-navy-950">
              자료실 둘러보기
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
