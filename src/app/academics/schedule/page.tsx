"use client";

import { PageHero } from "@/components/ui/PageHero";
import { useMembership } from "@/components/providers/MembershipProvider";
import { CalendarDayMarks, CalendarMarkLegend } from "@/components/schedule/CalendarDayMarks";
import { CalendarEventCard } from "@/components/schedule/CalendarEventCard";
import {
  calendarDayMarks,
  calendarEventMatchesCampus,
  calendarEventOccursOnDate,
  calendarEventVisualCategory,
  formatLecturePeriod,
  formatLectureWhen,
  GRADE_OPTIONS,
  CALENDAR_CAMPUSES,
  CALENDAR_EVENT_CATEGORIES,
  gradeLabel,
  lecturesOnDate,
  parseCalendarCampus,
  parseGrade,
  sortCalendarEventsForDisplay,
  type CalendarCampus,
  type CalendarEvent,
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
  const [campusFilter, setCampusFilter] = useState<CalendarCampus>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | CalendarEvent["category"]>("all");

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

  const marksByDate = useMemo(() => {
    const marked = new Map<string, ReturnType<typeof calendarDayMarks>>();
    days.forEach((cell) => {
      if (!cell) {
        return;
      }
      const marks = calendarDayMarks(events, lectures, cell.date, campusFilter, categoryFilter);
      if (marks.length > 0) {
        marked.set(cell.date, marks);
      }
    });
    return marked;
  }, [campusFilter, categoryFilter, days, events, lectures]);

  const dayEvents = sortCalendarEventsForDisplay(
    events.filter((event) => {
      if (!calendarEventOccursOnDate(event, selectedDate) || !calendarEventMatchesCampus(event, campusFilter)) {
        return false;
      }
      if (categoryFilter !== "all" && calendarEventVisualCategory(event) !== categoryFilter) {
        return false;
      }
      return true;
    }),
  );
  const dayLectures = categoryFilter === "all" || categoryFilter === "스터디" ? lecturesOnDate(lectures, selectedDate) : [];
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
        description="출석수업은 주황색, 시험·과제는 호박색, 스터디는 청록색으로 구분합니다. 학년과 과목 이름으로 주간 시간표를 필터할 수 있습니다."
      />
      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-12 lg:grid-cols-2">
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
            {days.map((cell, index) => {
              const marks = cell ? marksByDate.get(cell.date) ?? [] : [];
              const hasAttendance = marks.includes("출석수업");
              const hasAcademic = marks.includes("학사");
              return cell ? (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => setSelectedDate(cell.date)}
                  className={`rounded-xl py-3 text-sm ${
                    selectedDate === cell.date
                      ? "bg-cyan-500 text-navy-950"
                      : hasAttendance
                        ? "bg-orange-100 text-orange-950 hover:bg-orange-200 dark:bg-orange-400/15 dark:text-orange-100 dark:hover:bg-orange-400/25"
                        : hasAcademic
                          ? "bg-amber-100 text-amber-950 hover:bg-amber-200 dark:bg-amber-400/15 dark:text-amber-100 dark:hover:bg-amber-400/25"
                          : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  {cell.day}
                  <CalendarDayMarks marks={marks} inverted={selectedDate === cell.date} />
                </button>
              ) : (
                <span key={`empty-${index}`} />
              );
            })}
          </div>
          <CalendarMarkLegend />
        </article>
        <article className="glass-card rounded-3xl p-6">
          <div className="mb-4 grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="whitespace-nowrap text-lg font-semibold">{selectedDate} 일정</h2>
              {isAdmin ? (
                <Link
                  href="/admin/calendar"
                  className="shrink-0 rounded-full border border-[var(--line)] px-3 py-1.5 text-sm font-semibold text-cyan-700 dark:text-cyan-glow"
                >
                  일정 추가
                </Link>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={categoryFilter}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "all" || CALENDAR_EVENT_CATEGORIES.includes(value as CalendarEvent["category"])) {
                    setCategoryFilter(value as "all" | CalendarEvent["category"]);
                  }
                }}
                className="h-9 min-w-0 rounded-full border border-[var(--line)] bg-transparent px-3 text-sm"
                aria-label="일정 구분 필터"
              >
                <option value="all">전체 구분</option>
                {CALENDAR_EVENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category === "학사" ? "학사(시험·과제)" : category}
                  </option>
                ))}
              </select>
              <select
                value={campusFilter}
                onChange={(event) => {
                  const nextCampus = parseCalendarCampus(event.target.value);
                  if (nextCampus) {
                    setCampusFilter(nextCampus);
                  }
                }}
                className="h-9 min-w-0 rounded-full border border-[var(--line)] bg-transparent px-3 text-sm"
                aria-label="대학교 필터"
              >
                {CALENDAR_CAMPUSES.map((campus) => (
                  <option key={campus.value} value={campus.value}>
                    {campus.value === "all" ? "전체 대학교" : campus.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-3">
            {!hasDayItems ? (
              <p className="text-sm text-[var(--text-muted)]">이 날짜에는 등록된 학사/스터디 일정이 없습니다.</p>
            ) : (
              <>
                {dayEvents.map((event) => (
                  <CalendarEventCard key={event.id} event={event} />
                ))}
                {dayLectures.map((lecture) => (
                  <div
                    key={`${lecture.id}-${selectedDate}`}
                    className="relative overflow-hidden rounded-2xl border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-500/30 dark:bg-sky-400/10"
                  >
                    <span className="absolute inset-y-0 left-0 w-1.5 bg-sky-400" aria-hidden />
                    <p className="pl-2 text-xs font-semibold text-sky-700 dark:text-sky-300">
                      정규 강의 · {lecture.type} · {gradeLabel(lecture.grade)}
                    </p>
                    <p className="mt-1 pl-2 font-medium">{lecture.subject}</p>
                    <p className="mt-2 pl-2 text-sm text-[var(--text-muted)]">
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
