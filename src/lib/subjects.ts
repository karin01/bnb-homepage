import { Timestamp, collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { CLUB_STATUSES, REGISTERED_SUBJECTS, sortSubjectsByGrade, type ClubStatus, type RegisteredSubject } from "@/data/subjects";
import { isGrade, parseGrade, type Grade } from "@/data/schedule";

const SUBJECT_COLLECTION = "subjects";

function isClubStatus(value: string): value is ClubStatus {
  return CLUB_STATUSES.includes(value as ClubStatus);
}

function toSubject(id: string, data: Record<string, unknown>): RegisteredSubject | null {
  const grade = parseGrade(data.grade);
  const name = String(data.name ?? "").trim();
  if (!grade || !name) {
    return null;
  }

  const summary = String(data.summary ?? "").trim();
  const status = String(data.status ?? "").trim();
  const capacity = String(data.capacity ?? "").trim();

  return {
    id,
    grade,
    name,
    summary: summary || undefined,
    status: isClubStatus(status) ? status : undefined,
    capacity: capacity || undefined,
    hidden: data.hidden === true,
  };
}

export function validateSubjectInput(name: string, grade: Grade) {
  if (!name.trim() || name.trim().length > 80) {
    return "과목명은 1~80자로 입력해 주세요.";
  }
  if (!isGrade(grade)) {
    return "학년 또는 소모임을 선택해 주세요.";
  }
  return "";
}

export function validateClubInput(input: { name: string; summary: string; status: string; capacity: string }) {
  const nameError = validateSubjectInput(input.name, "club");
  if (nameError) {
    return nameError;
  }
  if (!input.summary.trim() || input.summary.trim().length > 200) {
    return "소개 글은 1~200자로 입력해 주세요.";
  }
  if (!isClubStatus(input.status)) {
    return "소모임 상태를 선택해 주세요.";
  }
  if (!input.capacity.trim() || input.capacity.trim().length > 20) {
    return "정원은 1~20자로 입력해 주세요.";
  }
  return "";
}

function upsertSubject(list: RegisteredSubject[], incoming: RegisteredSubject) {
  const byId = list.findIndex((item) => item.id === incoming.id);
  if (byId >= 0) {
    list[byId] = { ...list[byId], ...incoming };
    return;
  }
  const byName = list.findIndex((item) => item.grade === incoming.grade && item.name === incoming.name);
  if (byName >= 0) {
    list[byName] = { ...list[byName], ...incoming };
    return;
  }
  list.push(incoming);
}

function uniqueById(subjects: RegisteredSubject[]) {
  const byId = new Map<string, RegisteredSubject>();
  subjects.forEach((subject) => {
    byId.set(subject.id, subject);
  });
  return [...byId.values()];
}

function mergeSubjects(fromServer: RegisteredSubject[]) {
  const merged = [...REGISTERED_SUBJECTS];
  fromServer.forEach((subject) => {
    upsertSubject(merged, subject);
  });
  return sortSubjectsByGrade(uniqueById(merged)).filter((subject) => !subject.hidden);
}

export async function listRegisteredSubjects() {
  const snapshot = await getDocs(collection(getFirebaseDb(), SUBJECT_COLLECTION));
  const fromServer = snapshot.docs
    .map((item) => toSubject(item.id, item.data() as Record<string, unknown>))
    .filter((item): item is RegisteredSubject => item !== null);
  return mergeSubjects(fromServer);
}

export async function listClubSubjects() {
  const defaults = REGISTERED_SUBJECTS.filter((subject) => subject.grade === "club");
  try {
    const snapshot = await getDocs(query(collection(getFirebaseDb(), SUBJECT_COLLECTION), where("grade", "==", "club")));
    const fromServer = snapshot.docs
      .map((item) => toSubject(item.id, item.data() as Record<string, unknown>))
      .filter((item): item is RegisteredSubject => item !== null);

    const merged = [...defaults];
    fromServer.forEach((subject) => {
      upsertSubject(merged, subject);
    });
    return uniqueById(merged)
      .filter((subject) => !subject.hidden)
      .sort((left, right) => left.name.localeCompare(right.name, "ko"));
  } catch {
    return defaults;
  }
}

export async function saveRegisteredSubject(input: {
  id?: string;
  name: string;
  grade: Grade;
  summary?: string;
  status?: string;
  capacity?: string;
  hidden?: boolean;
}) {
  const errorMessage = validateSubjectInput(input.name, input.grade);
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  const subjectId = input.id?.trim() || `sub-${input.grade}-${Date.now()}`;
  const payload: Record<string, unknown> = {
    id: subjectId,
    name: input.name.trim(),
    grade: input.grade,
    updatedAt: serverTimestamp(),
  };
  if (input.summary !== undefined) {
    payload.summary = input.summary.trim();
  }
  if (input.status !== undefined) {
    payload.status = input.status.trim();
  }
  if (input.capacity !== undefined) {
    payload.capacity = input.capacity.trim();
  }
  if (input.hidden !== undefined) {
    payload.hidden = input.hidden;
  }

  await setDoc(doc(getFirebaseDb(), SUBJECT_COLLECTION, subjectId), payload, { merge: true });

  return {
    id: subjectId,
    name: input.name.trim(),
    grade: input.grade,
    summary: input.summary?.trim() || undefined,
    status: input.status?.trim() || undefined,
    capacity: input.capacity?.trim() || undefined,
  } satisfies RegisteredSubject;
}

export async function saveClubSubject(input: {
  id?: string;
  name: string;
  summary: string;
  status: ClubStatus;
  capacity: string;
}) {
  const errorMessage = validateClubInput(input);
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return saveRegisteredSubject({
    id: input.id,
    name: input.name,
    grade: "club",
    summary: input.summary,
    status: input.status,
    capacity: input.capacity,
    hidden: false,
  });
}

/** 기본 안내 소모임은 코드에 남아 있어 문서만 지우면 다시 나타납니다. hidden으로 목록에서 내립니다. */
export async function hideClubSubject(club: RegisteredSubject) {
  if (!club.id.trim() || club.grade !== "club") {
    throw new Error("삭제할 소모임을 찾지 못했습니다.");
  }

  await setDoc(
    doc(getFirebaseDb(), SUBJECT_COLLECTION, club.id.trim()),
    {
      id: club.id.trim(),
      name: club.name,
      grade: "club",
      hidden: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** 기본 전공 과목은 코드에 남아 있어, 문서만 지우면 다시 나타납니다. 그럴 때는 숨김으로 뺍니다. */
export async function hideOrRemoveSubject(subject: RegisteredSubject) {
  if (!subject.id.trim()) {
    throw new Error("삭제할 과목을 찾지 못했습니다.");
  }
  if (subject.grade === "club") {
    throw new Error("소모임은 소모임 관리에서 지워 주세요.");
  }

  const isBuiltin = REGISTERED_SUBJECTS.some((item) => item.id === subject.id);
  if (isBuiltin) {
    await saveRegisteredSubject({
      id: subject.id,
      name: subject.name,
      grade: subject.grade,
      summary: subject.summary,
      status: subject.status,
      capacity: subject.capacity,
      hidden: true,
    });
    return;
  }

  await removeRegisteredSubject(subject.id);
}

export async function removeRegisteredSubject(subjectId: string) {
  if (!subjectId) {
    throw new Error("삭제할 과목을 찾지 못했습니다.");
  }
  await deleteDoc(doc(getFirebaseDb(), SUBJECT_COLLECTION, subjectId));
}

/** 기본 전공 과목 목록을 Firestore에 한 번 올립니다. */
export async function seedRegisteredSubjects() {
  const existing = await listRegisteredSubjects();
  const db = getFirebaseDb();
  const snapshot = await getDocs(collection(db, SUBJECT_COLLECTION));
  if (snapshot.size > 0) {
    return existing;
  }

  await Promise.all(
    REGISTERED_SUBJECTS.map((subject) =>
      setDoc(doc(db, SUBJECT_COLLECTION, subject.id), {
        ...subject,
        summary: subject.summary ?? "",
        status: subject.status ?? "",
        capacity: subject.capacity ?? "",
        updatedAt: Timestamp.now(),
      }),
    ),
  );
  return REGISTERED_SUBJECTS;
}
