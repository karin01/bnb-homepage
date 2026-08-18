"use client";

import { useLectures } from "@/hooks/useLectures";
import {
  GRADE_OPTIONS,
  formatLecturePeriod,
  formatLectureWhen,
  formatWeekRange,
  gradeLabel,
  lecturesInWeek,
  type Grade,
} from "@/data/schedule";
import { useMemo, useState } from "react";

const GRADE_TABS: Array<Grade | "all"> = ["all", ...GRADE_OPTIONS.map((option) => option.value)];

export function WeeklySchedule() {
  const { lectures } = useLectures();
  const [selectedGrade, setSelectedGrade] = useState<Grade | "all">("all");
  const weekRange = formatWeekRange();

  const weekLectures = useMemo(() => lecturesInWeek(lectures), [lectures]);
  const visibleLectures = useMemo(
    () =>
      weekLectures.filter((lecture) =>
        selectedGrade === "all" ? lecture.type !== "오픈수업" : lecture.grade === selectedGrade,
      ),
    [weekLectures, selectedGrade],
  );

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.22em] text-cyan-600 uppercase dark:text-cyan-glow">This week</p>
          <h2 className="mt-2 text-2xl font-semibold md:text-3xl">이번 주 스터디 강의 라이브 일정</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{weekRange}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {GRADE_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSelectedGrade(tab)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                selectedGrade === tab
                  ? "bg-cyan-500 text-navy-950"
                  : "border border-[var(--line)] text-[var(--text-muted)]"
              }`}
            >
              {tab === "all" ? "전체" : gradeLabel(tab)}
            </button>
          ))}
        </div>
      </div>

      {visibleLectures.length === 0 ? (
        <p className="glass-card rounded-3xl px-6 py-10 text-sm leading-7 text-[var(--text-muted)]">
          이번 주({weekRange})에는 수업이 없습니다. 개강일 이후 해당 요일에만 일정이 올라옵니다.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visibleLectures.map((lecture) => (
            <article key={lecture.id} className="glass-card rounded-2xl p-5">
              <p className="text-xs text-cyan-700 dark:text-cyan-glow">
                {gradeLabel(lecture.grade)} · {lecture.type}
              </p>
              <h3 className="mt-2 text-lg font-semibold">{lecture.subject}</h3>
              <p className="mt-3 text-sm text-[var(--text-muted)]">{formatLectureWhen(lecture)}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {formatLecturePeriod(lecture)} · {lecture.room} · 강사 {lecture.instructor}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
