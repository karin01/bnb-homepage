export type ResourceKind = "실습" | "강의록" | "과제" | "기출";

export type ResourceItem = {
  id: string;
  grade: 1 | 2 | 3 | 4;
  title: string;
  subject: string;
  year: number;
  semester: "1" | "2";
  kind: ResourceKind;
  date: string;
  fileName: string;
  storagePath: string;
  fileSize: number;
  contentType: string;
};

export const RESOURCE_KINDS: ResourceKind[] = ["실습", "강의록", "과제", "기출"];
export const RESOURCE_SEMESTERS = ["1", "2"] as const;
export const RESOURCE_GRADES = [1, 2, 3, 4] as const;

export const GRADE_ROOMS = [
  {
    grade: 1 as const,
    title: "1학년 자료실",
    subjects: ["파이썬프로그래밍기초", "C프로그래밍", "컴퓨터과학개론", "AI리터러시"],
    summary: "프로그래밍의 첫 단추, 파이썬과 C를 실습 중심으로 아카이빙합니다.",
  },
  {
    grade: 2 as const,
    title: "2학년 자료실",
    subjects: ["자료구조", "이산수학", "Java프로그래밍", "오픈소스 기반 데이터 분석"],
    summary: "자료구조와 데이터 분석으로 전공 기초를 단단히 쌓습니다.",
  },
  {
    grade: 3 as const,
    title: "3학년 자료실",
    subjects: ["인공지능", "알고리즘", "JSP프로그래밍", "머신러닝"],
    summary: "AI·알고리즘·웹 백엔드까지 심화 전공을 커버합니다.",
  },
  {
    grade: 4 as const,
    title: "4학년 자료실",
    subjects: ["소프트웨어공학", "컴퓨터그래픽스", "정보통신망", "클라우드컴퓨팅"],
    summary: "졸업과 실무를 잇는 설계·네트워크·클라우드 자료를 모읍니다.",
  },
];

export function isResourceKind(value: string): value is ResourceKind {
  return RESOURCE_KINDS.includes(value as ResourceKind);
}

export function isResourceGrade(value: unknown): value is 1 | 2 | 3 | 4 {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

export function subjectsForGrade(grade: 1 | 2 | 3 | 4) {
  return GRADE_ROOMS.find((room) => room.grade === grade)?.subjects ?? [];
}

export const ARCHIVE_HUB_PATH = "/academics/resources";

export type ArchiveRoomId = 1 | 2 | 3 | 4 | "club";

/** 학년·소모임 자료실 방 주소. 예: /academics/resources/1 */
export function resourceBoardPath(room: ArchiveRoomId) {
  return `${ARCHIVE_HUB_PATH}/${room}`;
}

/** 쉐어노트 글 주소. GitHub Pages는 노트마다 HTML을 미리 만들 수 없어 방 주소에 번호를 붙입니다. */
export function shareNotePath(room: ArchiveRoomId, noteId: string) {
  return `${resourceBoardPath(room)}?note=${encodeURIComponent(noteId)}`;
}

export function parseArchiveRoomId(value: string): ArchiveRoomId | null {
  if (value === "club") {
    return "club";
  }
  if (value === "1") {
    return 1;
  }
  if (value === "2") {
    return 2;
  }
  if (value === "3") {
    return 3;
  }
  if (value === "4") {
    return 4;
  }
  return null;
}

/** 화면·관리 목록에 쓰는 방 이름 */
export function archiveRoomLabel(room: ArchiveRoomId) {
  return room === "club" ? "소모임 · 기타" : `${room}학년`;
}

/** Firestore에는 학년도 문자열로 저장합니다. 예: "1", "club" */
export function toArchiveRoomField(room: ArchiveRoomId) {
  return room === "club" ? "club" : String(room);
}

export function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0B";
  }
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
