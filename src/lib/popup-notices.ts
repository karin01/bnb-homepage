import { Timestamp, collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { validatePopupNotice, type PopupNotice } from "@/data/popup-notices";

const NOTICE_COLLECTION = "popupNotices";

function toMillis(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return 0;
}

function toPopupNotice(id: string, data: Record<string, unknown>): PopupNotice | null {
  const title = String(data.title ?? "").trim();
  const body = String(data.body ?? "").trim();
  const startDate = String(data.startDate ?? "");
  const endDate = String(data.endDate ?? "");
  if (!title || !body) {
    return null;
  }
  const notice: PopupNotice = {
    id,
    title,
    body,
    enabled: data.enabled !== false,
    startDate,
    endDate,
    updatedAtMs: toMillis(data.updatedAt),
  };
  return validatePopupNotice(notice) ? null : notice;
}

export async function listPopupNotices() {
  const snapshot = await getDocs(collection(getFirebaseDb(), NOTICE_COLLECTION));
  return snapshot.docs
    .map((item) => toPopupNotice(item.id, item.data() as Record<string, unknown>))
    .filter((item): item is PopupNotice => item !== null)
    .sort((left, right) => right.updatedAtMs - left.updatedAtMs || left.title.localeCompare(right.title, "ko"));
}

export async function savePopupNotice(input: PopupNotice) {
  const noticeId = input.id.trim();
  const noticeToSave: PopupNotice = {
    ...input,
    id: noticeId,
    title: input.title.trim(),
    body: input.body.trim(),
  };
  const errorMessage = validatePopupNotice(noticeToSave);
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  await setDoc(doc(getFirebaseDb(), NOTICE_COLLECTION, noticeId), {
    id: noticeId,
    title: noticeToSave.title,
    body: noticeToSave.body,
    enabled: noticeToSave.enabled,
    startDate: noticeToSave.startDate,
    endDate: noticeToSave.endDate,
    updatedAt: serverTimestamp(),
  });
}

export async function removePopupNotice(noticeId: string) {
  if (!noticeId) {
    throw new Error("삭제할 팝업 공지를 찾지 못했습니다.");
  }
  await deleteDoc(doc(getFirebaseDb(), NOTICE_COLLECTION, noticeId));
}
