import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import {
  LECTURE_ROOMS,
  LECTURE_TYPES,
  WEEKLY_LECTURES,
  isDateString,
  isGrade,
  isWeekday,
  parseGrade,
  parseRepeatCycle,
  toLectureRoom,
  withDefaultLectureSchedule,
  type LectureRoom,
  type LectureSlot,
} from "@/data/schedule";

const LECTURE_COLLECTION = "lectures";

function isLectureType(value: string): value is LectureSlot["type"] {
  return LECTURE_TYPES.includes(value as LectureSlot["type"]);
}

function isLectureRoom(value: string): value is LectureRoom {
  return LECTURE_ROOMS.includes(value as LectureRoom);
}

function toLecture(id: string, data: Record<string, unknown>): LectureSlot | null {
  const grade = parseGrade(data.grade);
  const weekday = String(data.weekday ?? "");
  const type = String(data.type ?? "");
  if (!grade || !isWeekday(weekday) || !isLectureType(type)) {
    return null;
  }

  return withDefaultLectureSchedule({
    id,
    grade,
    subject: String(data.subject ?? ""),
    instructor: String(data.instructor ?? "미정"),
    weekday,
    startTime: String(data.startTime ?? ""),
    endTime: String(data.endTime ?? ""),
    startDate: String(data.startDate ?? ""),
    endDate: String(data.endDate ?? ""),
    repeatCycle: parseRepeatCycle(data.repeatCycle) ?? undefined,
    room: toLectureRoom(String(data.room ?? "")),
    type,
  });
}

export function validateLectureInput(input: LectureSlot) {
  if (!input.id.trim() || input.id.trim().length > 40) {
    return "강의 ID는 1~40자로 입력해 주세요.";
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(input.id.trim())) {
    return "강의 ID는 영문, 숫자, 하이픈, 밑줄만 사용할 수 있습니다.";
  }
  if (!isGrade(input.grade)) {
    return "학년 또는 소모임을 확인해 주세요.";
  }
  if (!input.subject.trim()) {
    return "등록된 과목을 선택해 주세요.";
  }
  if (!input.instructor.trim() || input.instructor.trim().length > 40) {
    return "강사 이름은 1~40자로 입력해 주세요.";
  }
  if (!isWeekday(input.weekday)) {
    return "요일을 선택해 주세요.";
  }
  if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(input.startTime) || !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(input.endTime)) {
    return "시간은 24시간제 HH:MM 형식으로 입력해 주세요.";
  }
  if (!isLectureRoom(input.room)) {
    return "강의실은 실습실 또는 강의실 중에서 선택해 주세요.";
  }
  if (!isLectureType(input.type)) {
    return "수업 종류를 선택해 주세요.";
  }
  if (!parseRepeatCycle(input.repeatCycle)) {
    return "반복 주기를 선택해 주세요.";
  }
  if (!isDateString(input.startDate) || !isDateString(input.endDate)) {
    return "시작일과 종료일을 YYYY-MM-DD 형식으로 입력해 주세요.";
  }
  if (input.endDate < input.startDate) {
    return "종료일은 시작일보다 빠를 수 없습니다.";
  }
  if (input.repeatCycle === "한번" && input.startDate !== input.endDate) {
    return "한 번만 여는 수업은 시작일과 종료일을 같게 해 주세요.";
  }
  return "";
}

export async function listLectures() {
  const snapshot = await getDocs(collection(getFirebaseDb(), LECTURE_COLLECTION));
  return snapshot.docs
    .map((item) => toLecture(item.id, item.data() as Record<string, unknown>))
    .filter((item): item is LectureSlot => item !== null);
}

export async function saveLecture(input: LectureSlot) {
  const errorMessage = validateLectureInput(input);
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  const lectureId = input.id.trim();
  await setDoc(doc(getFirebaseDb(), LECTURE_COLLECTION, lectureId), {
    id: lectureId,
    grade: input.grade,
    subject: input.subject.trim(),
    instructor: input.instructor.trim(),
    weekday: input.weekday,
    startTime: input.startTime,
    endTime: input.endTime,
    startDate: input.startDate,
    endDate: input.endDate,
    repeatCycle: input.repeatCycle,
    room: input.room,
    type: input.type,
    updatedAt: serverTimestamp(),
  });
}

export async function removeLecture(lectureId: string) {
  if (!lectureId) {
    throw new Error("삭제할 강의를 찾지 못했습니다.");
  }
  await deleteDoc(doc(getFirebaseDb(), LECTURE_COLLECTION, lectureId));
}

/** Firestore가 비어 있을 때 안내 시간표를 한 번에 올립니다. */
export async function seedDefaultLectures() {
  const existing = await listLectures();
  if (existing.length > 0) {
    return existing;
  }

  const db = getFirebaseDb();
  const batch = writeBatch(db);
  WEEKLY_LECTURES.forEach((lecture) => {
    batch.set(doc(db, LECTURE_COLLECTION, lecture.id), {
      ...lecture,
      updatedAt: Timestamp.now(),
    });
  });
  await batch.commit();
  return WEEKLY_LECTURES;
}
