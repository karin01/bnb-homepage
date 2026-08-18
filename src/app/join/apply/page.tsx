import { PageHero } from "@/components/ui/PageHero";
import { SITE } from "@/data/site";

export default function ApplyPage() {
  return (
    <>
      <PageHero
        eyebrow="Application"
        title="Bit & Byte 입회원서"
        description="공식 구글폼으로 접수합니다. 제출된 신상 정보는 스터디 운영과 학습 편의에만 쓰이며, 작성일로부터 1년간 보관한 뒤 삭제됩니다."
      />
      <section className="mx-auto max-w-4xl px-5 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--text-muted)]">
            폼이 보이지 않으면 새 창에서 작성해 주세요.
          </p>
          <a
            href={SITE.googleFormUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950"
          >
            구글폼 새 창에서 열기
          </a>
        </div>
        <div className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white">
          <iframe
            title="Bit&Byte 스터디 가입 양식"
            src={SITE.googleFormEmbedUrl}
            className="h-[2200px] w-full"
          >
            이 브라우저는 iframe을 지원하지 않습니다. 구글폼 새 창에서 작성해 주세요.
          </iframe>
        </div>
      </section>
    </>
  );
}
