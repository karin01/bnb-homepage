import { DirectionsSection } from "@/components/about/DirectionsSection";
import { PageHero } from "@/components/ui/PageHero";
import { SITE } from "@/data/site";

const SPACE_FEATURES = [
  {
    name: "빔프로젝터 · 스크린",
    note: "분담 강의와 특강을 같은 화면으로 봅니다.",
  },
  {
    name: "개발 실습 PC",
    note: "수업이 끝나면 바로 코드를 돌려 봅니다.",
  },
  {
    name: "NAS 자료 서버",
    note: "학우들이 쌓아 온 자료를 아지트 안에서 나눕니다.",
  },
  {
    name: "함께 앉는 실습 자리",
    note: "혼자 듣기보다, 옆자리에 선후배가 있는 학습입니다.",
  },
];

const DAILY_LIFE = [
  "정규 강의와 오픈수업이 열리는 우리 교실입니다.",
  "소모임, OT, 신년회도 여기서 출발합니다.",
  "예약하거나 대여하는 공간이 아닙니다. 회원들의 아지트입니다.",
  "학교 도서관이 가까워 수업 전후 자료 찾기도 편합니다.",
];

export default function RoomPage() {
  return (
    <>
      <PageHero
        eyebrow="Our Place"
        title="혜화동, 우리 아지트"
        description={`${SITE.locationDetail}. 학우들이 매주 모이는 Bit & Byte의 집입니다.`}
      />
      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-12 md:grid-cols-2">
        <article className="glass-card rounded-3xl p-6">
          <h2 className="text-xl font-semibold">이 방에서 하는 일</h2>
          <ul className="mt-5 grid gap-3 text-sm leading-7 text-[var(--text-muted)]">
            {DAILY_LIFE.map((item) => (
              <li key={item} className="rounded-2xl border border-[var(--line)] px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </article>
        <article className="glass-card rounded-3xl p-6">
          <h2 className="text-xl font-semibold">아지트에 있는 것들</h2>
          <ul className="mt-5 grid gap-3">
            {SPACE_FEATURES.map((item) => (
              <li key={item.name} className="rounded-2xl border border-[var(--line)] px-4 py-3">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{item.note}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>
      <DirectionsSection />
    </>
  );
}
