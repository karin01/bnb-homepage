import type { CalendarDayMark } from "@/data/schedule";
import { CALENDAR_DAY_MARK_ORDER } from "@/data/schedule";

/** 달력 점 색. 학사만 주황이라 시험·출석 날이 따로 보입니다. */
export const CALENDAR_MARK_DOT_CLASS: Record<CalendarDayMark, string> = {
  학사: "bg-amber-500",
  스터디: "bg-cyan-500",
  행사: "bg-violet-500",
  강의: "bg-sky-400",
};

type CalendarDayMarksProps = {
  marks: CalendarDayMark[];
  inverted?: boolean;
};

export function CalendarDayMarks({ marks, inverted = false }: CalendarDayMarksProps) {
  return (
    <span className="mt-1 flex h-2 items-center justify-center gap-0.5">
      {marks.map((mark) => (
        <span
          key={mark}
          className={`block h-1.5 w-1.5 rounded-full ${inverted ? "bg-navy-950" : CALENDAR_MARK_DOT_CLASS[mark]}`}
          title={mark}
        />
      ))}
    </span>
  );
}

const MARK_LABEL: Record<CalendarDayMark, string> = {
  학사: "학사(시험·출석)",
  스터디: "스터디",
  행사: "행사",
  강의: "정규 강의",
};

export function CalendarMarkLegend() {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--text-muted)]">
      {CALENDAR_DAY_MARK_ORDER.map((mark) => (
        <li key={mark} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${CALENDAR_MARK_DOT_CLASS[mark]}`} aria-hidden />
          {MARK_LABEL[mark]}
        </li>
      ))}
    </ul>
  );
}
