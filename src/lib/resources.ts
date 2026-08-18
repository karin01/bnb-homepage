import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { ensureStorageAuth, getFirebaseDb, getFirebaseStorage } from "@/lib/firebase";
import { isDateString } from "@/data/schedule";
import {
  isResourceGrade,
  isResourceKind,
  type ResourceItem,
} from "@/data/resources";

const RESOURCE_COLLECTION = "resources";
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [
  "pdf",
  "zip",
  "hwp",
  "hwpx",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "txt",
  "py",
  "ipynb",
  "csv",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
];

function fileExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function toDisplayFileName(fileName: string) {
  const trimmed = fileName.trim().slice(0, 80);
  const safe = trimmed.replace(/[^\w가-힣.\-() ]+/g, "_").replace(/\s+/g, " ");
  return safe || "file";
}

/** Storage 경로에는 한글·공백을 넣지 않습니다. 화면에는 원래 이름을 보여 줍니다. */
function toStorageFileName(fileName: string) {
  const extension = fileExtension(fileName) || "bin";
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}-${randomPart}.${extension}`;
}

function toResource(id: string, data: Record<string, unknown>): ResourceItem | null {
  const grade = Number(data.grade);
  const title = String(data.title ?? "").trim();
  const subject = String(data.subject ?? "").trim();
  const year = Number(data.year);
  const semester = String(data.semester ?? "");
  const kind = String(data.kind ?? "");
  const date = String(data.date ?? "");
  const fileName = String(data.fileName ?? "").trim();
  const storagePath = String(data.storagePath ?? "").trim();
  const fileSize = Number(data.fileSize ?? 0);
  const contentType = String(data.contentType ?? "").trim();

  if (
    !isResourceGrade(grade) ||
    !title ||
    !subject ||
    !isResourceKind(kind) ||
    (semester !== "1" && semester !== "2") ||
    !isDateString(date) ||
    !fileName ||
    !storagePath
  ) {
    return null;
  }

  return {
    id,
    grade,
    title,
    subject,
    year,
    semester,
    kind,
    date,
    fileName,
    storagePath,
    fileSize: Number.isFinite(fileSize) ? fileSize : 0,
    contentType,
  };
}

export function validateResourceInput(input: {
  id: string;
  grade: number;
  title: string;
  subject: string;
  year: number;
  semester: string;
  kind: string;
  date: string;
}, file: File | null, hasExistingFile: boolean) {
  if (!input.id.trim() || input.id.trim().length > 40) {
    return "자료 ID는 1~40자로 입력해 주세요.";
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(input.id.trim())) {
    return "자료 ID는 영문, 숫자, 하이픈, 밑줄만 사용할 수 있습니다.";
  }
  if (!isResourceGrade(input.grade)) {
    return "학년을 선택해 주세요.";
  }
  if (!input.title.trim() || input.title.trim().length > 80) {
    return "제목은 1~80자로 입력해 주세요.";
  }
  if (!input.subject.trim() || input.subject.trim().length > 80) {
    return "과목을 1~80자로 입력해 주세요.";
  }
  if (!Number.isInteger(input.year) || input.year < 1990 || input.year > 2035) {
    return "연도를 확인해 주세요.";
  }
  if (input.semester !== "1" && input.semester !== "2") {
    return "학기를 선택해 주세요.";
  }
  if (!isResourceKind(input.kind)) {
    return "자료 유형을 선택해 주세요.";
  }
  if (!isDateString(input.date)) {
    return "날짜를 YYYY-MM-DD 형식으로 입력해 주세요.";
  }
  if (!file && !hasExistingFile) {
    return "파일을 첨부해 주세요.";
  }
  if (file) {
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
      return "파일은 20MB 이하만 올릴 수 있습니다.";
    }
    if (!ALLOWED_EXTENSIONS.includes(fileExtension(file.name))) {
      return "올릴 수 있는 파일 형식이 아닙니다. PDF, ZIP, 문서, 실습 코드 등을 올려 주세요.";
    }
  }
  return "";
}

export async function listResources() {
  const snapshot = await getDocs(collection(getFirebaseDb(), RESOURCE_COLLECTION));
  return snapshot.docs
    .map((item) => toResource(item.id, item.data() as Record<string, unknown>))
    .filter((item): item is ResourceItem => item !== null)
    .sort((left, right) => right.date.localeCompare(left.date) || left.title.localeCompare(right.title, "ko"));
}

export async function getResourceDownloadUrl(storagePath: string) {
  if (!storagePath.startsWith("resources/")) {
    throw new Error("잘못된 파일 경로입니다.");
  }
  return getDownloadURL(ref(getFirebaseStorage(), storagePath));
}

export async function saveResource(input: Omit<ResourceItem, "fileName" | "storagePath" | "fileSize" | "contentType"> & {
  fileName?: string;
  storagePath?: string;
  fileSize?: number;
  contentType?: string;
}, file: File | null) {
  const resourceId = input.id.trim();
  const hasExistingFile = Boolean(input.storagePath);
  const errorMessage = validateResourceInput(input, file, hasExistingFile);
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  let fileName = input.fileName ?? "";
  let storagePath = input.storagePath ?? "";
  let fileSize = input.fileSize ?? 0;
  let contentType = input.contentType ?? "";

  if (file) {
    fileName = toDisplayFileName(file.name);
    storagePath = `resources/${resourceId}/${toStorageFileName(file.name)}`;
    fileSize = Math.floor(file.size);
    contentType = (file.type || "application/octet-stream").slice(0, 80);
    await ensureStorageAuth();
    await uploadBytes(ref(getFirebaseStorage(), storagePath), file, { contentType });
  }

  await setDoc(doc(getFirebaseDb(), RESOURCE_COLLECTION, resourceId), {
    id: resourceId,
    grade: input.grade,
    title: input.title.trim(),
    subject: input.subject.trim(),
    year: input.year,
    semester: input.semester,
    kind: input.kind,
    date: input.date,
    fileName,
    storagePath,
    fileSize,
    contentType,
    updatedAt: serverTimestamp(),
  });
}

export async function removeResource(item: ResourceItem) {
  if (!item.id) {
    throw new Error("삭제할 자료를 찾지 못했습니다.");
  }
  await deleteDoc(doc(getFirebaseDb(), RESOURCE_COLLECTION, item.id));
  if (item.storagePath.startsWith("resources/")) {
    try {
      await deleteObject(ref(getFirebaseStorage(), item.storagePath));
    } catch {
      // 메타데이터는 지웠으므로, 파일이 이미 없어도 삭제는 성공으로 봅니다.
    }
  }
}

export { MAX_FILE_BYTES };
