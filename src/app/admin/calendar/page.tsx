"use client";

import {
  CALENDAR_CAMPUSES,
  CALENDAR_EVENT_CATEGORIES,
  CALENDAR_MEETING_MODES,
  CALENDAR_REPEAT_CYCLES,
  CALENDAR_REPEAT_HINTS,
  SEMESTER_END_DATE,
  SEMESTER_START_DATE,
  parseCalendarCampus,
  sortCalendarEventsForDisplay,
  parseCalendarMeetingMode,
  parseCalendarRepeatCycle,
  withDefaultCalendarRepeat,
  type CalendarEvent,
  type CalendarRepeatCycle,
} from "@/data/schedule";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { CalendarEventCard } from "@/components/schedule/CalendarEventCard";
import { toKoreanFirebaseError } from "@/lib/firebase-errors";
import { removeCalendarEvent, saveCalendarEvent, validateCalendarEvent } from "@/lib/calendar-events";
import { FormEvent, useState } from "react";

const EMPTY_FORM: CalendarEvent = {
  id: "",
  date: SEMESTER_START_DATE,
  endDate: SEMESTER_START_DATE,
  title: "",
  category: "스터디",
  description: "",
  repeatCycle: "하루",
  campus: "seongsu",
  meetingMode: "inPerson",
};

export default function AdminCalendarPage() {
  const { events, isLoading, reload, setEvents } = useCalendarEvents();
  const [form, setForm] = useState<CalendarEvent>(EMPTY_FORM);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const changeRepeatCycle = (repeatCycle: CalendarRepeatCycle) => {
    setForm((current) => ({
      ...current,
      repeatCycle,
      endDate: repeatCycle === "하루" ? current.date : current.endDate === current.date ? SEMESTER_END_DATE : current.endDate,
    }));
  };

  const changeStartDate = (nextStart: string) => {
    setForm((current) => ({
      ...current,
      date: nextStart,
      endDate: current.repeatCycle === "하루" ? nextStart : current.endDate < nextStart ? nextStart : current.endDate,
    }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const eventToSave = withDefaultCalendarRepeat({
      ...form,
      id: form.id.trim() || `evt-${Date.now()}`,
    });
    const validationMessage = validateCalendarEvent(eventToSave);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      await saveCalendarEvent(eventToSave);
      await reload();
      setForm(EMPTY_FORM);
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "일정을 저장하지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async (eventId: string) => {
    const confirmed = window.confirm("이 일정을 달력에서 삭제할까요?");
    if (!confirmed) {
      return;
    }
    setErrorMessage("");
    try {
      await removeCalendarEvent(eventId);
      setEvents((current) => current.filter((item) => item.id !== eventId));
      await reload();
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "일정을 삭제하지 못했습니다."));
    }
  };

  const isSingleDay = form.repeatCycle === "하루";

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">학사·스터디 일정</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          OT·과제 마감은 하루, 출석수업은 기간, 정기 모임은 매주/격주로 넣으면 됩니다. 매주 반복되는 정규 강의는 수업 시간표에서 등록합니다.
          시험·출석·과제는 구분을 <strong className="font-semibold text-amber-700 dark:text-amber-300">학사</strong>로 두면 달력에서 주황색으로 먼저 보입니다.
        </p>
      </div>
      {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}

      <form onSubmit={onSubmit} className="glass-card grid items-start gap-3 rounded-3xl p-5 md:grid-cols-2">
        <div className="grid items-start gap-3 md:col-span-2 md:grid-cols-3">
          <label className="grid gap-1 text-sm">
            반복
            <select
              value={form.repeatCycle}
              onChange={(event) => {
                const nextCycle = parseCalendarRepeatCycle(event.target.value);
                if (nextCycle) {
                  changeRepeatCycle(nextCycle);
                }
              }}
              className="h-10 rounded-xl border border-[var(--line)] bg-transparent px-3"
            >
              {CALENDAR_REPEAT_CYCLES.map((cycle) => (
                <option key={cycle} value={cycle}>
                  {cycle}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            구분
            <select
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value as CalendarEvent["category"] })}
              className="h-10 rounded-xl border border-[var(--line)] bg-transparent px-3"
            >
              {CALENDAR_EVENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            대학교
            <select
              value={form.campus}
              onChange={(event) => {
                const nextCampus = parseCalendarCampus(event.target.value);
                if (nextCampus) {
                  setForm({ ...form, campus: nextCampus });
                }
              }}
              className="h-10 rounded-xl border border-[var(--line)] bg-transparent px-3"
            >
              {CALENDAR_CAMPUSES.map((campus) => (
                <option key={campus.value} value={campus.value}>
                  {campus.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-[var(--text-muted)]">과제 마감처럼 어디든 같으면 공통을 고르세요.</span>
          </label>
        </div>
        <p className="md:col-span-2 text-xs text-[var(--text-muted)]">{CALENDAR_REPEAT_HINTS[form.repeatCycle]}</p>
        <div className="grid items-start gap-3 md:col-span-2 md:grid-cols-3">
          <label className="grid gap-1 text-sm">
            시작일
            <input
              type="date"
              value={form.date}
              onChange={(event) => changeStartDate(event.target.value)}
              className="h-10 rounded-xl border border-[var(--line)] bg-transparent px-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            종료일
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => setForm({ ...form, endDate: event.target.value })}
              disabled={isSingleDay}
              className="h-10 rounded-xl border border-[var(--line)] bg-transparent px-3 disabled:opacity-60"
            />
          </label>
          <label className="grid gap-1 text-sm">
            대면/비대면
            <select
              value={form.meetingMode}
              onChange={(event) => {
                const nextMode = parseCalendarMeetingMode(event.target.value);
                if (nextMode) {
                  setForm({ ...form, meetingMode: nextMode });
                }
              }}
              className="h-10 rounded-xl border border-[var(--line)] bg-transparent px-3"
            >
              {CALENDAR_MEETING_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-[var(--text-muted)]">제목에 대면/비대면을 적지 않아도 됩니다.</span>
          </label>
        </div>
        <label className="grid gap-1 text-sm md:col-span-2">
          제목
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            className="h-10 rounded-xl border border-[var(--line)] bg-transparent px-3"
            placeholder="예: 자료구조"
          />
        </label>
        <label className="grid gap-1 text-sm md:col-span-2">
          설명
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className="min-h-24 rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            placeholder="학우에게 보여줄 한두 문장"
          />
        </label>
        <div className="md:col-span-2 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950 disabled:opacity-60"
          >
            {isSaving ? "저장 중..." : "일정 저장"}
          </button>
          <button type="button" onClick={() => setForm(EMPTY_FORM)} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            입력칸 비우기
          </button>
        </div>
      </form>

      <article className="glass-card rounded-3xl p-5">
        <h2 className="font-semibold">등록된 일정 {isLoading ? "" : `(${events.length})`}</h2>
        <div className="mt-4 grid gap-2">
          {sortCalendarEventsForDisplay(events).map((item) => (
            <CalendarEventCard
              key={item.id}
              event={item}
              actions={
                <>
                  <button type="button" onClick={() => setForm(withDefaultCalendarRepeat(item))} className="rounded-full border border-[var(--line)] px-3 py-1 text-sm">
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete(item.id)}
                    className="rounded-full border border-rose-300 px-3 py-1 text-sm text-rose-600 dark:border-rose-500/50 dark:text-rose-300"
                  >
                    삭제
                  </button>
                </>
              }
            />
          ))}
        </div>
      </article>
    </div>
  );
}
