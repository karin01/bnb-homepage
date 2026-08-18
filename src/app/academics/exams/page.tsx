import { PageHero } from "@/components/ui/PageHero";

const GUIDES = [
  {
    title: "중간과제물",
    points: ["과목별 주제 공지 확인", "스터디 첨삭 마감일을 학교 마감보다 3~4일 앞당김", "표절·AI 사용 범위를 강의별로 안내"],
  },
  {
    title: "출석수업",
    points: ["출석 주간에는 정규 스터디 시간표가 조정될 수 있음", "출석 자료는 해당 학년 자료실에 아카이브", "당일 실습이 있는 과목은 노트북 지참"],
  },
  {
    title: "기말평가",
    points: ["기출 풀이 특강을 시험 2주 전부터 집중 편성", "오답 노트를 소모임/학년 단톡에 공유", "시험 유형(객관식/서술)별 체크리스트 제공"],
  },
];

export default function ExamsPage() {
  return (
    <>
      <PageHero
        eyebrow="Exam Guide"
        title="중간 · 출석 · 기말, 일정에 맞춘 학습 가이드"
        description="학교 학사일정과 스터디 케어 일정을 겹쳐 보면, 언제 무엇을 준비해야 하는지 흔들리지 않습니다."
      />
      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-16 md:grid-cols-3">
        {GUIDES.map((guide) => (
          <article key={guide.title} className="glass-card rounded-3xl p-6">
            <h2 className="text-xl font-semibold">{guide.title}</h2>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-[var(--text-muted)]">
              {guide.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </>
  );
}
