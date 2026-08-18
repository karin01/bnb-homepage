import {
  calendarCampusLabel,
  calendarEventHighlightLabel,
  calendarEventVisualCategory,
  calendarMeetingModeLabel,
  formatCalendarEventPeriod,
  type CalendarEvent,
} from "@/data/schedule";
import type { ReactNode } from "react";

/** 출석수업은 주황, 학사(시험·과제)는 호박색, 스터디는 청록, 행사는 보라입니다. */
const CATEGORY_THEME = {
  출석수업: {
    card: "border-[var(--line)] bg-orange-50 dark:bg-orange-400/10",
    bar: "bg-orange-500",
    badge: "bg-orange-500 text-navy-950",
  },
  학사: {
    card: "border-[var(--line)] bg-amber-50 dark:bg-amber-400/10",
    bar: "bg-amber-500",
    badge: "bg-amber-500 text-navy-950",
  },
  스터디: {
    card: "border-[var(--line)] bg-cyan-50 dark:bg-cyan-400/10",
    bar: "bg-cyan-500",
    badge: "bg-cyan-500 text-navy-950",
  },
  행사: {
    card: "border-[var(--line)] bg-violet-50 dark:bg-violet-400/10",
    bar: "bg-violet-500",
    badge: "bg-violet-500 text-white dark:text-navy-950",
  },
} as const;

type CalendarEventCardProps = {
  event: CalendarEvent;
  actions?: ReactNode;
};

export function CalendarEventCard({ event, actions }: CalendarEventCardProps) {
  const visualCategory = calendarEventVisualCategory(event);
  const theme = CATEGORY_THEME[visualCategory];
  const highlightLabel = calendarEventHighlightLabel(event);
  const campusLabel = calendarCampusLabel(event.campus);
  const meetingLabel = event.meetingMode === "none" ? "" : calendarMeetingModeLabel(event.meetingMode);

  return (
    <article className={`relative overflow-hidden rounded-2xl border px-4 py-3 ${theme.card}`}>
      {/* 왼쪽 색 막대: 카드가 많아도 학사/스터디를 세로로 훑을 수 있습니다. */}
      <span className={`absolute inset-y-0 left-0 w-1.5 ${theme.bar}`} aria-hidden />
      <div className="flex flex-col gap-3 pl-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${theme.badge}`}>{visualCategory}</span>
            {highlightLabel ? (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold text-white">{highlightLabel}</span>
            ) : null}
            {meetingLabel ? (
              <span className="rounded-full border border-[var(--line)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                {meetingLabel}
              </span>
            ) : null}
            <span className="rounded-full border border-[var(--line)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
              {campusLabel}
            </span>
          </div>
          <p className="mt-2 text-base font-semibold tracking-tight">{event.title}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{formatCalendarEventPeriod(event)}</p>
          {event.description.trim() ? <p className="mt-1 text-sm text-[var(--text-muted)]">{event.description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
    </article>
  );
}
