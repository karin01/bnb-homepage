import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Timestamp, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { ensureStorageAuth, getFirebaseDb, getFirebaseStorage } from "@/lib/firebase";
import { parseArchiveRoomId, toArchiveRoomField, type ArchiveRoomId } from "@/data/resources";
import {
  SHARE_NOTE_EXTENSIONS,
  SHARE_NOTE_MAX_BODY_LENGTH,
  SHARE_NOTE_MAX_FILE_BYTES,
  SHARE_NOTE_MAX_TAG_LENGTH,
  SHARE_NOTE_MAX_TAGS,
  parseShareNoteRoom,
  parseShareNoteTags,
  shareNoteExtension,
  type ShareNoteItem,
} from "@/data/share-notes";

const SHARE_NOTE_COLLECTION = "shareNotes";

function toSafeFileName(fileName: string) {
  const trimmed = fileName.trim().slice(0, 80);
  const safe = trimmed.replace(/[^\w가-힣.\-() ]+/g, "_").replace(/\s+/g, " ");
  return safe || "note";
}

function createShareNoteId() {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `note-${Date.now()}-${randomPart}`.slice(0, 40);
}

function toIsoDate(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return "";
}

function toShareNote(id: string, data: Record<string, unknown>): ShareNoteItem | null {
  const room = parseShareNoteRoom(data.room);
  const subject = String(data.subject ?? "").trim();
  const title = String(data.title ?? "").trim();
  const body = String(data.body ?? "");
  const tags = Array.isArray(data.tags)
    ? data.tags.map((item) => String(item).trim()).filter(Boolean)
    : parseShareNoteTags(String(data.tags ?? ""));
  const uploaderUid = String(data.uploaderUid ?? "").trim();
  const uploaderName = String(data.uploaderName ?? "").trim();
  const fileName = String(data.fileName ?? "").trim();
  const storagePath = String(data.storagePath ?? "").trim();
  const fileSize = Number(data.fileSize ?? 0);
  const contentType = String(data.contentType ?? "").trim();
  const createdAt = toIsoDate(data.createdAt);

  if (!title || tags.length === 0 || !uploaderUid || !uploaderName || !fileName || !storagePath) {
    return null;
  }

  return {
    id,
    room,
    subject,
    title,
    body,
    tags,
    uploaderUid,
    uploaderName,
    fileName,
    storagePath,
    fileSize: Number.isFinite(fileSize) ? fileSize : 0,
    contentType,
    createdAt,
  };
}

export function validateShareNoteInput(input: {
  room: ArchiveRoomId;
  subject: string;
  title: string;
  body: string;
  tags: string;
  uploaderUid: string;
  uploaderName: string;
}, file: File | null, hasExistingFile = false) {
  if (!parseArchiveRoomId(toArchiveRoomField(input.room))) {
    return "자료실 방을 확인해 주세요.";
  }
  if (!input.subject.trim() || input.subject.trim().length > 80) {
    return "과목을 선택해 주세요. 목록에 없으면 운영진이 학습일정에서 등록합니다.";
  }
  if (!input.title.trim() || input.title.trim().length > 80) {
    return "제목은 1~80자로 입력해 주세요.";
  }
  if (input.body.length > SHARE_NOTE_MAX_BODY_LENGTH) {
    return `본문은 ${SHARE_NOTE_MAX_BODY_LENGTH}자 이하로 입력해 주세요.`;
  }
  const tags = parseShareNoteTags(input.tags);
  if (tags.length === 0) {
    return "태그를 하나 이상 입력해 주세요. 예: C언어, 소모임";
  }
  if (tags.some((tag) => tag.length > SHARE_NOTE_MAX_TAG_LENGTH) || tags.length > SHARE_NOTE_MAX_TAGS) {
    return `태그는 ${SHARE_NOTE_MAX_TAGS}개까지, 각 ${SHARE_NOTE_MAX_TAG_LENGTH}자 이하입니다.`;
  }
  if (!input.uploaderUid.trim()) {
    return "로그인 후 노트를 올릴 수 있습니다.";
  }
  if (!input.uploaderName.trim() || input.uploaderName.trim().length > 40) {
    return "작성자 이름을 확인해 주세요.";
  }
  if (!file && !hasExistingFile) {
    return "파일을 첨부해 주세요.";
  }
  if (file) {
    if (file.size <= 0 || file.size > SHARE_NOTE_MAX_FILE_BYTES) {
      return "파일은 20MB 이하만 올릴 수 있습니다.";
    }
    if (!SHARE_NOTE_EXTENSIONS.includes(shareNoteExtension(file.name) as (typeof SHARE_NOTE_EXTENSIONS)[number])) {
      return "올릴 수 있는 파일 형식이 아닙니다. PDF, MP3, 이미지, 문서, 실습 파일을 올려 주세요.";
    }
  }
  return "";
}

export async function listShareNotes() {
  const snapshot = await getDocs(collection(getFirebaseDb(), SHARE_NOTE_COLLECTION));
  return snapshot.docs
    .map((item) => toShareNote(item.id, item.data() as Record<string, unknown>))
    .filter((item): item is ShareNoteItem => item !== null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || left.title.localeCompare(right.title, "ko"));
}

export async function readShareNote(noteId: string) {
  if (!noteId.trim()) {
    return null;
  }
  const snapshot = await getDoc(doc(getFirebaseDb(), SHARE_NOTE_COLLECTION, noteId.trim()));
  if (!snapshot.exists()) {
    return null;
  }
  return toShareNote(snapshot.id, snapshot.data() as Record<string, unknown>);
}

export function filterShareNotes(notes: ShareNoteItem[], keyword: string, room?: ArchiveRoomId) {
  const scoped = room
    ? notes.filter((note) => toArchiveRoomField(note.room) === toArchiveRoomField(room))
    : notes;
  const queryTags = parseShareNoteTags(keyword);
  const haystack = keyword.trim().toLowerCase();
  if (!haystack) {
    return scoped;
  }

  return scoped.filter((note) => {
    const titleHit =
      note.title.toLowerCase().includes(haystack) ||
      note.subject.toLowerCase().includes(haystack) ||
      note.fileName.toLowerCase().includes(haystack) ||
      note.body.toLowerCase().includes(haystack);
    const tagHit =
      queryTags.length > 0
        ? queryTags.every((queryTag) => note.tags.some((tag) => tag.toLowerCase() === queryTag.toLowerCase()))
        : note.tags.some((tag) => tag.toLowerCase().includes(haystack));
    return titleHit || tagHit;
  });
}

export async function getShareNoteDownloadUrl(storagePath: string) {
  if (!storagePath.startsWith("share-notes/")) {
    throw new Error("잘못된 파일 경로입니다.");
  }
  return getDownloadURL(ref(getFirebaseStorage(), storagePath));
}

export async function saveShareNote(input: {
  room: ArchiveRoomId;
  subject: string;
  title: string;
  body: string;
  tags: string;
  uploaderUid: string;
  uploaderName: string;
}, file: File) {
  const errorMessage = validateShareNoteInput(input, file);
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  const noteId = createShareNoteId();
  const fileName = toSafeFileName(file.name);
  const storagePath = `share-notes/${noteId}/${fileName}`;
  const contentType = (file.type || "application/octet-stream").slice(0, 80);

  await ensureStorageAuth();
  await uploadBytes(ref(getFirebaseStorage(), storagePath), file, { contentType });

  await setDoc(doc(getFirebaseDb(), SHARE_NOTE_COLLECTION, noteId), {
    id: noteId,
    room: toArchiveRoomField(input.room),
    subject: input.subject.trim(),
    title: input.title.trim(),
    body: input.body.slice(0, SHARE_NOTE_MAX_BODY_LENGTH),
    tags: parseShareNoteTags(input.tags),
    uploaderUid: input.uploaderUid.trim(),
    uploaderName: input.uploaderName.trim(),
    fileName,
    storagePath,
    fileSize: Math.floor(file.size),
    contentType,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return noteId;
}

export async function updateShareNoteContent(item: ShareNoteItem, input: { title: string; body: string; tags: string; subject: string }) {
  const errorMessage = validateShareNoteInput(
    {
      room: item.room,
      subject: input.subject,
      title: input.title,
      body: input.body,
      tags: input.tags,
      uploaderUid: item.uploaderUid,
      uploaderName: item.uploaderName,
    },
    null,
    true,
  );
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  await updateDoc(doc(getFirebaseDb(), SHARE_NOTE_COLLECTION, item.id), {
    title: input.title.trim(),
    body: input.body.slice(0, SHARE_NOTE_MAX_BODY_LENGTH),
    tags: parseShareNoteTags(input.tags),
    subject: input.subject.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function removeShareNote(item: ShareNoteItem) {
  if (!item.id) {
    throw new Error("삭제할 노트를 찾지 못했습니다.");
  }
  await deleteDoc(doc(getFirebaseDb(), SHARE_NOTE_COLLECTION, item.id));
  if (item.storagePath.startsWith("share-notes/")) {
    try {
      await deleteObject(ref(getFirebaseStorage(), item.storagePath));
    } catch {
      // 목록은 지웠으므로, 파일이 이미 없어도 삭제는 성공으로 봅니다.
    }
  }
}
