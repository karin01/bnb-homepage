import { isDateString, toDateString } from "@/data/schedule";

const DISMISS_STORAGE_KEY = "bnb-popup-notice-dismiss";
const SESSION_CLOSED_PREFIX = "bnb-popup-notice-closed-";

export type PopupNotice = {
  id: string;
  title: string;
  body: string;
  enabled: boolean;
  startDate: string;
  endDate: string;
  updatedAtMs: number;
};

export type PopupNoticeDismissRecord = {
  id: string;
  untilDate: string;
};

export function todayDateString() {
  return toDateString(new Date());
}

export function createEmptyPopupNotice(today = todayDateString()): PopupNotice {
  return {
    id: "",
    title: "",
    body: "",
    enabled: true,
    startDate: today,
    endDate: today,
    updatedAtMs: 0,
  };
}

export function validatePopupNotice(input: PopupNotice) {
  if (!input.id.trim() || input.id.trim().length > 40) {
    return "공지 ID는 1~40자로 입력해 주세요.";
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(input.id.trim())) {
    return "공지 ID는 영문, 숫자, 하이픈, 밑줄만 사용할 수 있습니다.";
  }
  if (!input.title.trim() || input.title.trim().length > 80) {
    return "제목은 1~80자로 입력해 주세요.";
  }
  if (!input.body.trim() || input.body.trim().length > 800) {
    return "본문은 1~800자로 입력해 주세요.";
  }
  if (!isDateString(input.startDate) || !isDateString(input.endDate)) {
    return "시작일과 종료일을 YYYY-MM-DD 형식으로 입력해 주세요.";
  }
  if (input.endDate < input.startDate) {
    return "종료일은 시작일보다 빠를 수 없습니다.";
  }
  return "";
}

/** 켜 두었고 오늘이 기간 안인 공지 중, 가장 최근 저장한 한 장만 고릅니다. */
export function pickActivePopupNotice(notices: PopupNotice[], today = todayDateString()) {
  return (
    notices
      .filter((notice) => notice.enabled && notice.startDate <= today && notice.endDate >= today)
      .sort((left, right) => right.updatedAtMs - left.updatedAtMs || right.startDate.localeCompare(left.startDate))[0] ?? null
  );
}

export function popupNoticeStatusLabel(notice: PopupNotice, today = todayDateString()) {
  if (!notice.enabled) {
    return "꺼짐";
  }
  if (today < notice.startDate) {
    return "예약";
  }
  if (today > notice.endDate) {
    return "기간 종료";
  }
  return "표시 중";
}

export function isPopupNoticeDismissedToday(noticeId: string, today = todayDateString()) {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) {
      return false;
    }
    const parsed = JSON.parse(raw) as PopupNoticeDismissRecord;
    return parsed.id === noticeId && parsed.untilDate >= today;
  } catch {
    return false;
  }
}

export function dismissPopupNoticeForToday(noticeId: string, today = todayDateString()) {
  if (typeof window === "undefined") {
    return;
  }
  const record: PopupNoticeDismissRecord = { id: noticeId, untilDate: today };
  window.localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(record));
}

export function isPopupNoticeClosedThisSession(noticeId: string) {
  if (typeof window === "undefined") {
    return false;
  }
  return window.sessionStorage.getItem(`${SESSION_CLOSED_PREFIX}${noticeId}`) === "1";
}

export function closePopupNoticeThisSession(noticeId: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(`${SESSION_CLOSED_PREFIX}${noticeId}`, "1");
}
