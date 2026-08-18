import { formatFileSize, parseArchiveRoomId, type ArchiveRoomId } from "@/data/resources";

export const CLUB_ARCHIVE_ROOM = {
  id: "club" as const,
  title: "소모임 · 기타",
  summary: "소모임과 학년 밖 학습 노트를 태그로 찾아 공유합니다. PDF는 바로 공부할 수 있습니다.",
};

export const SHARE_NOTE_MAX_FILE_BYTES = 20 * 1024 * 1024;
export const SHARE_NOTE_MAX_BODY_LENGTH = 8000;
export const SHARE_NOTE_MAX_TAGS = 8;
export const SHARE_NOTE_MAX_TAG_LENGTH = 20;

/** 쉐어노트에서 올리던 형식에, 소모임 실습 파일도 쓸 수 있게 자료실 형식을 보탰습니다. */
export const SHARE_NOTE_EXTENSIONS = [
  "pdf",
  "mp3",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
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
] as const;

export type ShareNoteItem = {
  id: string;
  room: ArchiveRoomId;
  title: string;
  body: string;
  tags: string[];
  uploaderUid: string;
  uploaderName: string;
  fileName: string;
  storagePath: string;
  fileSize: number;
  contentType: string;
  createdAt: string;
};

/** 예전 노트에 방이 없으면 소모임으로 읽습니다. */
export function parseShareNoteRoom(value: unknown): ArchiveRoomId {
  if (typeof value === "number") {
    return parseArchiveRoomId(String(value)) ?? "club";
  }
  return parseArchiveRoomId(String(value ?? "").trim()) ?? "club";
}

export function parseShareNoteTags(raw: string) {
  const uniqueTags: string[] = [];
  raw.split(",").forEach((part) => {
    const tag = part.trim().slice(0, SHARE_NOTE_MAX_TAG_LENGTH);
    if (!tag) {
      return;
    }
    const alreadyAdded = uniqueTags.some((item) => item.toLowerCase() === tag.toLowerCase());
    if (!alreadyAdded && uniqueTags.length < SHARE_NOTE_MAX_TAGS) {
      uniqueTags.push(tag);
    }
  });
  return uniqueTags;
}

export function shareNoteExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function isShareNoteImage(fileName: string) {
  return ["png", "jpg", "jpeg", "gif", "webp"].includes(shareNoteExtension(fileName));
}

export function isShareNotePdf(fileName: string) {
  return shareNoteExtension(fileName) === "pdf";
}

export function isShareNoteAudio(fileName: string) {
  return shareNoteExtension(fileName) === "mp3";
}

export function formatShareNoteDate(isoDate: string) {
  if (!isoDate) {
    return "-";
  }
  return isoDate.slice(0, 10);
}

export { formatFileSize };
