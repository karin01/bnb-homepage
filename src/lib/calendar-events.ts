import { Timestamp, collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import {
  CALENDAR_EVENTS,
  isDateString,
  parseCalendarCampus,
  parseCalendarEventCategory,
  parseCalendarMeetingMode,
  parseCalendarRepeatCycle,
  withDefaultCalendarRepeat,
  type CalendarEvent,
} from "@/data/schedule";

const EVENT_COLLECTION = "calendarEvents";

function isEventCategory(value: string): value is CalendarEvent["category"] {
  return parseCalendarEventCategory(value) !== null;
}

function toCalendarEvent(id: string, data: Record<string, unknown>): CalendarEvent | null {
  const date = String(data.date ?? "");
  const rawEndDate = String(data.endDate ?? "");
  const endDate = isDateString(rawEndDate) ? rawEndDate : date;
  const title = String(data.title ?? "").trim();
  const category = String(data.category ?? "");
  const description = String(data.description ?? "").trim();
  if (!isDateString(date) || !title || !isEventCategory(category)) {
    return null;
  }
  return withDefaultCalendarRepeat({
    id,
    date,
    endDate,
    title,
    category,
    description,
    repeatCycle: parseCalendarRepeatCycle(data.repeatCycle) ?? undefined,
    campus: parseCalendarCampus(data.campus) ?? undefined,
    meetingMode: parseCalendarMeetingMode(data.meetingMode) ?? undefined,
  });
}

export function validateCalendarEvent(input: CalendarEvent) {
  const normalized = withDefaultCalendarRepeat(input);
  if (!normalized.id.trim() || normalized.id.trim().length > 40) {
    return "일정 ID는 1~40자로 입력해 주세요.";
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(normalized.id.trim())) {
    return "일정 ID는 영문, 숫자, 하이픈, 밑줄만 사용할 수 있습니다.";
  }
  if (!isDateString(normalized.date) || !isDateString(normalized.endDate)) {
    return "시작일과 종료일을 YYYY-MM-DD 형식으로 입력해 주세요.";
  }
  if (normalized.endDate < normalized.date) {
    return "종료일은 시작일보다 빠를 수 없습니다.";
  }
  if (normalized.repeatCycle === "하루" && normalized.date !== normalized.endDate) {
    return "하루 일정은 시작일과 종료일을 같게 해 주세요.";
  }
  if ((normalized.repeatCycle === "매주" || normalized.repeatCycle === "격주") && normalized.date === normalized.endDate) {
    return "매주/격주는 종료일을 시작일보다 뒤로 잡아 주세요. 하루만이면 '하루'를 선택하면 됩니다.";
  }
  if (!normalized.title.trim() || normalized.title.trim().length > 80) {
    return "제목은 1~80자로 입력해 주세요.";
  }
  if (!isEventCategory(normalized.category)) {
    return "구분을 선택해 주세요.";
  }
  if (!parseCalendarCampus(normalized.campus)) {
    return "대학교를 선택해 주세요.";
  }
  if (!parseCalendarMeetingMode(normalized.meetingMode)) {
    return "대면/비대면을 선택해 주세요.";
  }
  if (!normalized.description.trim() || normalized.description.trim().length > 200) {
    return "설명은 1~200자로 입력해 주세요.";
  }
  return "";
}

export async function listCalendarEvents() {
  const snapshot = await getDocs(collection(getFirebaseDb(), EVENT_COLLECTION));
  return snapshot.docs
    .map((item) => toCalendarEvent(item.id, item.data() as Record<string, unknown>))
    .filter((item): item is CalendarEvent => item !== null)
    .sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title, "ko"));
}

async function seedDefaultEventsIfEmpty() {
  const existing = await listCalendarEvents();
  if (existing.length > 0) {
    return existing;
  }

  const db = getFirebaseDb();
  const batch = writeBatch(db);
  CALENDAR_EVENTS.forEach((event) => {
    batch.set(doc(db, EVENT_COLLECTION, event.id), {
      ...event,
      updatedAt: Timestamp.now(),
    });
  });
  await batch.commit();
  return CALENDAR_EVENTS;
}

export async function saveCalendarEvent(input: CalendarEvent) {
  const errorMessage = validateCalendarEvent(input);
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  await seedDefaultEventsIfEmpty();
  const eventId = input.id.trim();
  const normalized = withDefaultCalendarRepeat({ ...input, id: eventId });
  await setDoc(doc(getFirebaseDb(), EVENT_COLLECTION, eventId), {
    id: eventId,
    date: normalized.date,
    endDate: normalized.endDate,
    title: normalized.title.trim(),
    category: normalized.category,
    campus: normalized.campus,
    meetingMode: normalized.meetingMode,
    description: normalized.description.trim(),
    repeatCycle: normalized.repeatCycle,
    updatedAt: serverTimestamp(),
  });
}

export async function removeCalendarEvent(eventId: string) {
  if (!eventId) {
    throw new Error("삭제할 일정을 찾지 못했습니다.");
  }
  // 삭제는 시드하지 않습니다. 비어 있을 때 다시 넣으면 지운 기본 일정이 살아납니다.
  await deleteDoc(doc(getFirebaseDb(), EVENT_COLLECTION, eventId));
}
