"use client";

import { PageHero } from "@/components/ui/PageHero";
import { useMembership } from "@/components/providers/MembershipProvider";
import {
  calendarEventOccursOnDate,
  formatCalendarEventPeriod,
  formatLecturePeriod,
  formatLectureWhen,
  GRADE_OPTIONS,
  gradeLabel,
  lecturesOnDate,
  parseGrade,
  type Grade,
} from "@/data/schedule";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useLectures } from "@/hooks/useLectures";
import Link from "next/link";
import { useMemo, useState } from "react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export default function SchedulePage() {
  const { isAdmin } = useMembership();
  const { lectures } = useLectures();
  const { events } = useCalendarEvents();
  const today = new Date(2026, 8, 5);
  const [monthCursor, setMonthCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState("2026-09-05");
  const [subjectQuery, setSubjectQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<"all" | Grade>("all");

  const days = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ date: string; day: number } | null> = [];
    for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= lastDate; day += 1) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({ date, day });
    }
    return cells;
  }, [monthCursor]);

  const datesWithItems = useMemo(() => {
    const marked = new Set<string>();
    days.forEach((cell) => {
      if (!cell) {
        return;
      }
      if (events.some((event) => calendarEventOccursOnDate(event, cell.date))) {
        marked.add(cell.date);
      }
      if (lecturesOnDate(lectures, cell.date).length > 0) {
        marked.add(cell.date);
      }
    });
    return marked;
  }, [days, lectures, events]);

  const dayEvents = events.filter((event) => calendarEventOccursOnDate(event, selectedDate));
  const dayLectures = lecturesOnDate(lectures, selectedDate);
  const filteredLectures = useMemo(() => {
    const needle = subjectQuery.trim().toLowerCase();
    const gradeFromQuery = needle ? parseGrade(needle.replace("학년", "")) : null;
    return lectures.filter((lecture) => {
      if (gradeFilter !== "all" && lecture.grade !== gradeFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const haystack = `${lecture.subject} ${lecture.instructor} ${gradeLabel(lecture.grade)}`.toLowerCase();
      if (haystack.includes(needle)) {
        return true;
      }
      return gradeFromQuery !== null && lecture.grade === gradeFromQuery;
    });
  }, [gradeFilter, lectures, subjectQuery]);
  const hasDayItems = dayEvents.length > 0 || dayLectures.length > 0;

  return (
    <>
      <PageHero
        eyebrow="Calendar"
        title="학사일정 + 스터디 강의 통합 캘린더"
        description="출석수업, 과제 마감, 기말평가와 BnB 정규 강의를 한 화면에서 봅니다. 학년과 과목 이름으로 주간 시간표를 필터할 수 있습니다."
      />
      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="glass-card rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {monthCursor.getFullYear()}년 {monthCursor.getMonth() + 1}월
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-full border border-[var(--line)] px-3 py-1 text-sm"
                onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
              >
                이전
              </button>
              <button
                type="button"
                className="rounded-full border border-[var(--line)] px-3 py-1 text-sm"
                onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
              >
                다음
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-xs text-[var(--text-muted)]">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
            {days.map((cell, index) =>
              cell ? (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => setSelectedDate(cell.date)}
                  className={`rounded-xl py-3 text-sm ${
                    selectedDate === cell.date ? "bg-cyan-500 text-navy-950" : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  {cell.day}
                  {datesWithItems.has(cell.date) ? (
                    <span className="mt-1 block h-1.5 w-1.5 mx-auto rounded-full bg-cyan-400" />
                  ) : null}
                </button>
              ) : (
                <span key={`empty-${index}`} />
              ),
            )}
          </div>
        </article>
        <article className="glass-card rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{selectedDate} 일정</h2>
            {isAdmin ? (
              <Link href="/admin/calendar" className="text-sm font-semibold text-cyan-700 dark:text-cyan-glow">
                일정 추가
              </Link>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3">
            {!hasDayItems ? (
              <p className="text-sm text-[var(--text-muted)]">이 날짜에는 등록된 학사/스터디 일정이 없습니다.</p>
            ) : (
              <>
                {dayEvents.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-[var(--line)] p-4">
                    <p className="text-xs text-cyan-700 dark:text-cyan-glow">
                      {event.category} · {formatCalendarEventPeriod(event)}
                    </p>
                    <p className="mt-1 font-medium">{event.title}</p>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">{event.description}</p>
                  </div>
                ))}
                {dayLectures.map((lecture) => (
                  <div key={`${lecture.id}-${selectedDate}`} className="rounded-2xl border border-[var(--line)] p-4">
                    <p className="text-xs text-cyan-700 dark:text-cyan-glow">
                      스터디 · {lecture.type} · {gradeLabel(lecture.grade)}
                    </p>
                    <p className="mt-1 font-medium">{lecture.subject}</p>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      {lecture.startTime}~{lecture.endTime} · {lecture.room} · 강사 {lecture.instructor}
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>
        </article>
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-semibold">주간 정규 강의</h2>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <select
              value={gradeFilter === "all" ? "all" : String(gradeFilter)}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "all") {
                  setGradeFilter("all");
                  return;
                }
                const nextGrade = parseGrade(value);
                if (nextGrade) {
                  setGradeFilter(nextGrade);
                }
              }}
              className="rounded-full border border-[var(--line)] bg-transparent px-4 py-2 text-sm md:w-36"
              aria-label="학년 필터"
            >
              <option value="all">전체 학년</option>
              {GRADE_OPTIONS.map((option) => (
                <option key={String(option.value)} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              value={subjectQuery}
              onChange={(event) => setSubjectQuery(event.target.value)}
              placeholder="과목·학년 검색 (예: 인공지능, 2학년)"
              className="w-full rounded-full border border-[var(--line)] bg-transparent px-4 py-2 text-sm md:w-72"
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {filteredLectures.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] md:col-span-2">조건에 맞는 강의가 없습니다. 학년이나 과목명을 바꿔 보세요.</p>
          ) : (
            filteredLectures.map((lecture) => (
            <article key={lecture.id} className="rounded-2xl border border-[var(--line)] p-4">
              <p className="text-xs text-cyan-700 dark:text-cyan-glow">
                {gradeLabel(lecture.grade)} · {formatLectureWhen(lecture)}
              </p>
              <p className="mt-1 font-medium">{lecture.subject}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {formatLecturePeriod(lecture)} · {lecture.room} · 강사 {lecture.instructor}
              </p>
            </article>
            ))
          )}
        </div>
      </section>
    </>
  );
}
