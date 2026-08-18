export type Grade = 1 | 2 | 3 | 4 | "club";
export type Weekday = "월" | "화" | "수" | "목" | "금" | "토" | "일";
export type LectureRoom = "실습실" | "강의실";
export type LectureType = "정규" | "특강" | "오픈수업" | "소모임";
export type RepeatCycle = "매주" | "격주" | "한번";

export const LECTURE_ROOMS: LectureRoom[] = ["실습실", "강의실"];
export const LECTURE_TYPES: LectureType[] = ["정규", "특강", "오픈수업", "소모임"];
export const WEEKDAYS: Weekday[] = ["월", "화", "수", "목", "금", "토", "일"];
export const REPEAT_CYCLES: RepeatCycle[] = ["매주", "격주", "한번"];
export const SEMESTER_START_DATE = "2026-09-05";
export const SEMESTER_END_DATE = "2026-12-20";

/** 시간표/과목 분류. 학년과 소모임을 한곳에서만 정의합니다. */
export const GRADE_OPTIONS: Array<{ value: Grade; label: string }> = [
  { value: 1, label: "1학년" },
  { value: 2, label: "2학년" },
  { value: 3, label: "3학년" },
  { value: 4, label: "4학년" },
  { value: "club", label: "소모임" },
];

export function isGrade(value: unknown): value is Grade {
  return parseGrade(value) !== null;
}

export function parseGrade(value: unknown): Grade | null {
  if (value === "club" || value === "소모임") {
    return "club";
  }
  const asNumber = Number(value);
  if (asNumber === 1 || asNumber === 2 || asNumber === 3 || asNumber === 4) {
    return asNumber;
  }
  return null;
}

export function gradeLabel(grade: Grade) {
  return GRADE_OPTIONS.find((option) => option.value === grade)?.label ?? `${grade}학년`;
}

export function gradeSortValue(grade: Grade) {
  return grade === "club" ? 5 : grade;
}

export type LectureSlot = {
  id: string;
  grade: Grade;
  subject: string;
  instructor: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  repeatCycle: RepeatCycle;
  room: LectureRoom;
  type: LectureType;
};

export type LectureDraft = Omit<LectureSlot, "startDate" | "endDate" | "repeatCycle"> &
  Partial<Pick<LectureSlot, "startDate" | "endDate" | "repeatCycle">>;

export function toLectureRoom(room: string): LectureRoom {
  return room === "실습실" ? "실습실" : "강의실";
}

export function isWeekday(value: string): value is Weekday {
  return WEEKDAYS.includes(value as Weekday);
}

export function parseRepeatCycle(value: unknown): RepeatCycle | null {
  return REPEAT_CYCLES.includes(value as RepeatCycle) ? (value as RepeatCycle) : null;
}

export function isDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && toDateString(parsed) === value;
}

export function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function weekdayFromDate(dateString: string): Weekday {
  const parsed = new Date(`${dateString}T00:00:00`);
  const sundayFirst: Weekday[] = ["일", "월", "화", "수", "목", "금", "토"];
  return Number.isNaN(parsed.getTime()) ? "토" : sundayFirst[parsed.getDay()];
}

/** 예전 시간표 문서에도 기간/반복이 비어 있을 수 있어 학기 기본값으로 채웁니다. */
export function withDefaultLectureSchedule(lecture: LectureDraft): LectureSlot {
  return {
    ...lecture,
    startDate: isDateString(lecture.startDate ?? "") ? lecture.startDate! : SEMESTER_START_DATE,
    endDate: isDateString(lecture.endDate ?? "") ? lecture.endDate! : SEMESTER_END_DATE,
    repeatCycle: parseRepeatCycle(lecture.repeatCycle) ?? "매주",
  };
}

export function formatLectureWhen(lecture: LectureSlot) {
  const timeRange = `${lecture.startTime}~${lecture.endTime}`;
  if (lecture.repeatCycle === "한번") {
    return `${lecture.startDate} ${timeRange}`;
  }
  return `${lecture.repeatCycle} ${lecture.weekday} ${timeRange}`;
}

export function formatLecturePeriod(lecture: LectureSlot) {
  if (lecture.repeatCycle === "한번") {
    return lecture.startDate;
  }
  return `${lecture.startDate} ~ ${lecture.endDate}`;
}

function addDays(dateString: string, days: number) {
  const next = new Date(`${dateString}T00:00:00`);
  next.setDate(next.getDate() + days);
  return toDateString(next);
}

function diffInDays(fromDate: string, toDate: string) {
  return Math.round(
    (new Date(`${toDate}T00:00:00`).getTime() - new Date(`${fromDate}T00:00:00`).getTime()) / 86_400_000,
  );
}

function firstMatchingWeekday(startDate: string, weekday: Weekday, endDate: string) {
  let cursor = startDate;
  while (cursor <= endDate) {
    if (weekdayFromDate(cursor) === weekday) {
      return cursor;
    }
    cursor = addDays(cursor, 1);
  }
  return null;
}

/** 반복 규칙(매주/격주/한번)을 실제 날짜에 펼칩니다. 달력은 이 함수만 사용합니다. */
export function lectureOccursOnDate(lecture: LectureSlot, dateString: string) {
  if (!isDateString(dateString) || dateString < lecture.startDate || dateString > lecture.endDate) {
    return false;
  }
  if (lecture.repeatCycle === "한번") {
    return dateString === lecture.startDate;
  }
  if (weekdayFromDate(dateString) !== lecture.weekday) {
    return false;
  }
  if (lecture.repeatCycle === "매주") {
    return true;
  }

  const firstDate = firstMatchingWeekday(lecture.startDate, lecture.weekday, lecture.endDate);
  if (!firstDate) {
    return false;
  }
  const diffDays = diffInDays(firstDate, dateString);
  return diffDays >= 0 && diffDays % 14 === 0;
}

export function lecturesOnDate(lectures: LectureSlot[], dateString: string) {
  return lectures.filter((lecture) => lectureOccursOnDate(lecture, dateString));
}

/** 월요일을 이번 주 시작으로 봅니다. */
export function startOfWeekMonday(date = new Date()) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = local.getDay();
  const daysFromMonday = weekday === 0 ? -6 : 1 - weekday;
  local.setDate(local.getDate() + daysFromMonday);
  return local;
}

export function weekDateStrings(date = new Date()) {
  const start = startOfWeekMonday(date);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    return toDateString(next);
  });
}

export function formatWeekRange(date = new Date()) {
  const days = weekDateStrings(date);
  return `${days[0]} ~ ${days[6]}`;
}

/** 이번 주(월~일)에 실제로 열리는 강의만 남깁니다. */
export function lecturesInWeek(lectures: LectureSlot[], date = new Date()) {
  const weekDates = weekDateStrings(date);
  return lectures.filter((lecture) => weekDates.some((day) => lectureOccursOnDate(lecture, day)));
}

/** 2026-2학기 정규 강의 슬롯 (기존 사이트 과목 구성을 반영한 안내 데이터) */
export const WEEKLY_LECTURES: LectureSlot[] = (
  [
    {
      id: "g1-python",
      grade: 1,
      subject: "파이썬프로그래밍기초",
      instructor: "미정",
      weekday: "토",
      startTime: "14:00",
      endTime: "16:00",
      room: "강의실",
      type: "정규",
    },
  {
    id: "g1-c",
    grade: 1,
    subject: "C프로그래밍",
    instructor: "미정",
    weekday: "일",
    startTime: "10:00",
    endTime: "12:00",
    room: "실습실",
    type: "정규",
  },
  {
    id: "g1-intro",
    grade: 1,
    subject: "컴퓨터과학개론",
    instructor: "미정",
    weekday: "수",
    startTime: "19:30",
    endTime: "21:00",
    room: "강의실",
    type: "정규",
  },
  {
    id: "g2-db",
    grade: 2,
    subject: "오픈소스 기반 데이터 분석",
    instructor: "미정",
    weekday: "일",
    startTime: "13:00",
    endTime: "15:00",
    room: "강의실",
    type: "정규",
  },
  {
    id: "g2-ds",
    grade: 2,
    subject: "자료구조",
    instructor: "미정",
    weekday: "토",
    startTime: "16:30",
    endTime: "18:30",
    room: "강의실",
    type: "정규",
  },
  {
    id: "g2-java",
    grade: 2,
    subject: "Java프로그래밍",
    instructor: "미정",
    weekday: "목",
    startTime: "19:30",
    endTime: "21:00",
    room: "실습실",
    type: "정규",
  },
  {
    id: "g3-ai",
    grade: 3,
    subject: "인공지능",
    instructor: "미정",
    weekday: "일",
    startTime: "15:30",
    endTime: "17:30",
    room: "강의실",
    type: "정규",
  },
  {
    id: "g3-algo",
    grade: 3,
    subject: "알고리즘",
    instructor: "미정",
    weekday: "토",
    startTime: "10:00",
    endTime: "12:00",
    room: "강의실",
    type: "정규",
  },
  {
    id: "g3-jsp",
    grade: 3,
    subject: "JSP프로그래밍",
    instructor: "미정",
    weekday: "금",
    startTime: "19:30",
    endTime: "21:00",
    room: "실습실",
    type: "정규",
  },
  {
    id: "g4-se",
    grade: 4,
    subject: "소프트웨어공학",
    instructor: "미정",
    weekday: "일",
    startTime: "10:00",
    endTime: "12:00",
    room: "강의실",
    type: "정규",
  },
  {
    id: "g4-net",
    grade: 4,
    subject: "정보통신망",
    instructor: "미정",
    weekday: "토",
    startTime: "13:00",
    endTime: "15:00",
    room: "강의실",
    type: "정규",
  },
  {
    id: "open-2026-2",
    grade: 1,
    subject: "2학기 오픈수업 (전 학년 청강)",
    instructor: "미정",
    weekday: "토",
    startTime: "14:00",
    endTime: "16:00",
    room: "강의실",
    type: "오픈수업",
  },
] as LectureDraft[]).map(withDefaultLectureSchedule);

export type CalendarRepeatCycle = "하루" | "기간" | "매주" | "격주";

export const CALENDAR_REPEAT_CYCLES: CalendarRepeatCycle[] = ["하루", "기간", "매주", "격주"];

export const CALENDAR_REPEAT_HINTS: Record<CalendarRepeatCycle, string> = {
  하루: "시작일 하루에만 표시됩니다.",
  기간: "시작일부터 종료일까지 매일 표시됩니다. 출석수업처럼 이어지는 안내에 씁니다.",
  매주: "시작일 요일을 기준으로 종료일까지 매주 표시됩니다.",
  격주: "시작일 요일을 기준으로 종료일까지 2주마다 표시됩니다.",
};

/** 출석수업·대면 일정이 열리는 방송대 장소. 공통은 캠퍼스와 무관한 학사 안내용입니다. */
export const CALENDAR_CAMPUSES = [
  { value: "all", label: "공통" },
  { value: "seongsu", label: "지역대학(성수)" },
  { value: "south", label: "남부학습관" },
  { value: "west", label: "서부학습관" },
] as const;

export type CalendarCampus = (typeof CALENDAR_CAMPUSES)[number]["value"];

export type CalendarEvent = {
  id: string;
  date: string;
  endDate: string;
  title: string;
  category: "학사" | "스터디" | "행사";
  description: string;
  repeatCycle: CalendarRepeatCycle;
  campus: CalendarCampus;
  meetingMode: CalendarMeetingMode;
};

export function isCalendarCampus(value: string): value is CalendarCampus {
  return CALENDAR_CAMPUSES.some((campus) => campus.value === value);
}

export function parseCalendarCampus(value: unknown): CalendarCampus | null {
  return isCalendarCampus(String(value ?? "")) ? (value as CalendarCampus) : null;
}

export function calendarCampusLabel(campus: CalendarCampus | string | undefined) {
  return CALENDAR_CAMPUSES.find((item) => item.value === campus)?.label ?? "공통";
}

/** 수업이 학습관에 모이는지, 온라인인지. 과제 마감처럼 해당 없으면 해당없음을 씁니다. */
export const CALENDAR_MEETING_MODES = [
  { value: "inPerson", label: "대면" },
  { value: "online", label: "비대면" },
  { value: "none", label: "해당없음" },
] as const;

export type CalendarMeetingMode = (typeof CALENDAR_MEETING_MODES)[number]["value"];

export function isCalendarMeetingMode(value: string): value is CalendarMeetingMode {
  return CALENDAR_MEETING_MODES.some((mode) => mode.value === value);
}

export function parseCalendarMeetingMode(value: unknown): CalendarMeetingMode | null {
  return isCalendarMeetingMode(String(value ?? "")) ? (value as CalendarMeetingMode) : null;
}

export function calendarMeetingModeLabel(mode: CalendarMeetingMode | string | undefined) {
  return CALENDAR_MEETING_MODES.find((item) => item.value === mode)?.label ?? "해당없음";
}

/** 달력 필터. 전체를 보면 모두 보이고, 학습관을 고르면 그곳 일정과 공통 일정을 함께 봅니다. */
export function calendarEventMatchesCampus(event: CalendarEvent, campusFilter: CalendarCampus) {
  if (campusFilter === "all") {
    return true;
  }
  return event.campus === "all" || event.campus === campusFilter;
}

export function isCalendarRepeatCycle(value: string): value is CalendarRepeatCycle {
  return CALENDAR_REPEAT_CYCLES.includes(value as CalendarRepeatCycle);
}

export function parseCalendarRepeatCycle(value: unknown): CalendarRepeatCycle | null {
  return isCalendarRepeatCycle(String(value ?? "")) ? (value as CalendarRepeatCycle) : null;
}

/** 예전 문서에 반복·대학교·대면여부가 없으면, 하루/기간·공통·해당없음으로 읽습니다. */
export function withDefaultCalendarRepeat(
  event: Omit<CalendarEvent, "repeatCycle" | "campus" | "meetingMode"> & {
    repeatCycle?: CalendarRepeatCycle | string;
    campus?: CalendarCampus | string;
    meetingMode?: CalendarMeetingMode | string;
  },
) {
  const endDate = isDateString(event.endDate) ? event.endDate : event.date;
  const parsed = parseCalendarRepeatCycle(event.repeatCycle);
  const repeatCycle = parsed ?? (event.date === endDate ? "하루" : "기간");
  return {
    ...event,
    endDate: repeatCycle === "하루" ? event.date : endDate,
    repeatCycle,
    campus: parseCalendarCampus(event.campus) ?? "all",
    meetingMode: parseCalendarMeetingMode(event.meetingMode) ?? "none",
  } satisfies CalendarEvent;
}

/** 예전 문서에 종료일이 없으면 시작일과 같은 하루 일정으로 봅니다. */
export function calendarEventEndDate(event: Pick<CalendarEvent, "date" | "endDate">) {
  return isDateString(event.endDate) ? event.endDate : event.date;
}

export function calendarEventOccursOnDate(event: CalendarEvent, dateString: string) {
  if (!isDateString(dateString)) {
    return false;
  }
  const normalized = withDefaultCalendarRepeat(event);
  const endDate = calendarEventEndDate(normalized);
  if (dateString < normalized.date || dateString > endDate) {
    return false;
  }
  if (normalized.repeatCycle === "하루") {
    return dateString === normalized.date;
  }
  if (normalized.repeatCycle === "기간") {
    return true;
  }

  const elapsedDays = diffInDays(normalized.date, dateString);
  if (elapsedDays < 0) {
    return false;
  }
  if (normalized.repeatCycle === "매주") {
    return elapsedDays % 7 === 0;
  }
  return elapsedDays % 14 === 0;
}

export function formatCalendarEventPeriod(event: CalendarEvent) {
  const normalized = withDefaultCalendarRepeat(event);
  const endDate = calendarEventEndDate(normalized);
  if (normalized.repeatCycle === "하루") {
    return normalized.date;
  }
  if (normalized.repeatCycle === "기간") {
    return `${normalized.date} ~ ${endDate}`;
  }
  return `${normalized.repeatCycle} ${weekdayFromDate(normalized.date)} ${normalized.date} ~ ${endDate}`;
}

/** 달력 카드 위에 보여줄 한 줄. 해당없음인 대면여부는 빼서 제목이 지저분해지지 않게 합니다. */
export function formatCalendarEventMeta(event: CalendarEvent) {
  const normalized = withDefaultCalendarRepeat(event);
  const parts: string[] = [normalized.category, calendarCampusLabel(normalized.campus)];
  if (normalized.meetingMode !== "none") {
    parts.push(calendarMeetingModeLabel(normalized.meetingMode));
  }
  return parts.join(" · ");
}

/** 학사(시험·출석)가 스터디보다 위에 오도록 목록을 정렬합니다. */
const CALENDAR_CATEGORY_SORT_RANK: Record<CalendarEvent["category"], number> = {
  학사: 0,
  행사: 1,
  스터디: 2,
};

export function compareCalendarEventsForDisplay(left: CalendarEvent, right: CalendarEvent) {
  const categoryDiff = CALENDAR_CATEGORY_SORT_RANK[left.category] - CALENDAR_CATEGORY_SORT_RANK[right.category];
  if (categoryDiff !== 0) {
    return categoryDiff;
  }
  const dateDiff = left.date.localeCompare(right.date);
  if (dateDiff !== 0) {
    return dateDiff;
  }
  return left.title.localeCompare(right.title, "ko");
}

export function sortCalendarEventsForDisplay(events: CalendarEvent[]) {
  return [...events].sort(compareCalendarEventsForDisplay);
}

/** 제목·설명에서 시험·출석·과제를 찾아, 카드에 붙일 강조 꼬리표를 고릅니다. */
export function calendarEventHighlightLabel(event: CalendarEvent) {
  const text = `${event.title} ${event.description}`;
  if (/기말/.test(text)) {
    return "기말";
  }
  if (/중간/.test(text)) {
    return "중간";
  }
  if (/출석/.test(text)) {
    return "출석수업";
  }
  if (/과제|마감/.test(text)) {
    return "과제 마감";
  }
  if (/시험|평가/.test(text)) {
    return "시험";
  }
  return "";
}

/** 달력 칸에 찍는 점. 학사는 주황이라 시험·출석 날이 한눈에 보입니다. */
export type CalendarDayMark = "학사" | "스터디" | "행사" | "강의";

export const CALENDAR_DAY_MARK_ORDER: CalendarDayMark[] = ["학사", "스터디", "행사", "강의"];

export function calendarDayMarks(
  events: CalendarEvent[],
  lectures: LectureSlot[],
  dateString: string,
  campusFilter: CalendarCampus,
  categoryFilter: "all" | CalendarEvent["category"] = "all",
): CalendarDayMark[] {
  const matchingEvents = events.filter((event) => {
    if (!calendarEventOccursOnDate(event, dateString) || !calendarEventMatchesCampus(event, campusFilter)) {
      return false;
    }
    if (categoryFilter !== "all" && event.category !== categoryFilter) {
      return false;
    }
    return true;
  });
  const marks: CalendarDayMark[] = [];
  if (matchingEvents.some((event) => event.category === "학사")) {
    marks.push("학사");
  }
  if (matchingEvents.some((event) => event.category === "스터디")) {
    marks.push("스터디");
  }
  if (matchingEvents.some((event) => event.category === "행사")) {
    marks.push("행사");
  }
  const showLectures = categoryFilter === "all" || categoryFilter === "스터디";
  if (showLectures && lecturesOnDate(lectures, dateString).length > 0) {
    marks.push("강의");
  }
  return marks;
}

export const CALENDAR_EVENT_CATEGORIES: CalendarEvent["category"][] = ["학사", "스터디", "행사"];

/** 방통대 학사 + BnB 일정을 한 캘린더에서 보기 위한 샘플 */
export const CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: "e1",
    date: "2026-08-16",
    endDate: "2026-08-16",
    title: "2학기 오픈수업 안내 게시",
    category: "스터디",
    description: "신·편입생 대상 오픈수업 일정과 입회 안내가 시작됩니다.",
    repeatCycle: "하루",
    campus: "all",
    meetingMode: "none",
  },
  {
    id: "e2",
    date: "2026-08-29",
    endDate: "2026-08-29",
    title: "2학기 스터디 OT",
    category: "행사",
    description: "혜화동 스터디룸에서 학기 오리엔테이션을 진행합니다.",
    repeatCycle: "하루",
    campus: "all",
    meetingMode: "none",
  },
  {
    id: "e3",
    date: "2026-09-05",
    endDate: "2026-09-05",
    title: "정규 강의 개강",
    category: "스터디",
    description: "학년별 분담 강의가 본격적으로 시작됩니다.",
    repeatCycle: "하루",
    campus: "all",
    meetingMode: "none",
  },
  {
    id: "e4",
    date: "2026-10-10",
    endDate: "2026-10-10",
    title: "출석수업 기간",
    category: "학사",
    description: "방송대 공식 출석수업 기간입니다. 스터디 시간표가 일부 조정될 수 있습니다.",
    repeatCycle: "하루",
    campus: "all",
    meetingMode: "none",
  },
  {
    id: "e5",
    date: "2026-10-25",
    endDate: "2026-10-25",
    title: "중간과제물 제출 마감",
    category: "학사",
    description: "학년별 과제 가이드와 첨삭 일정을 자료실에서 확인하세요.",
    repeatCycle: "하루",
    campus: "all",
    meetingMode: "none",
  },
  {
    id: "e6",
    date: "2026-12-12",
    endDate: "2026-12-12",
    title: "기말평가 기간",
    category: "학사",
    description: "기출 풀이 특강이 집중 편성됩니다.",
    repeatCycle: "하루",
    campus: "all",
    meetingMode: "none",
  },
];
