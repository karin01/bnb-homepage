import { GRADE_ROOMS } from "@/data/resources";
import { LABS } from "@/data/content";
import { gradeSortValue, type Grade } from "@/data/schedule";

export type RegisteredSubject = {
  id: string;
  grade: Grade;
  name: string;
  summary?: string;
  status?: string;
  capacity?: string;
  hidden?: boolean;
};

export const CLUB_STATUSES = ["모집중", "진행중", "시즌 운영", "대기", "친목"] as const;
export type ClubStatus = (typeof CLUB_STATUSES)[number];

/** 방통대 컴과 전공 과목. 시간표에서는 이 목록에서 고릅니다. */
export const REGISTERED_SUBJECTS: RegisteredSubject[] = [
  ...GRADE_ROOMS.flatMap((room) =>
    room.subjects.map((name, index) => ({
      id: `g${room.grade}-sub-${index + 1}`,
      grade: room.grade,
      name,
    })),
  ),
  {
    id: "open-all",
    grade: 1,
    name: "2학기 오픈수업 (전 학년 청강)",
  },
  ...LABS.map((lab) => ({
    id: lab.id,
    grade: "club" as const,
    name: lab.name,
    summary: lab.summary,
    status: lab.status,
    capacity: lab.capacity,
  })),
];

export function subjectsForGrade(grade: Grade, extraSubjects: RegisteredSubject[] = []) {
  const merged = [...REGISTERED_SUBJECTS, ...extraSubjects];
  const uniqueNames = new Set<string>();
  return merged.filter((subject) => {
    if (subject.grade !== grade || uniqueNames.has(subject.name)) {
      return false;
    }
    uniqueNames.add(subject.name);
    return true;
  }).sort((left, right) => left.name.localeCompare(right.name, "ko"));
}

export function sortSubjectsByGrade(subjects: RegisteredSubject[]) {
  return [...subjects].sort(
    (left, right) => gradeSortValue(left.grade) - gradeSortValue(right.grade) || left.name.localeCompare(right.name, "ko"),
  );
}
