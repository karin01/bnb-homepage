import { Timestamp, collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ensureStorageAuth, getFirebaseDb, getFirebaseStorage } from "@/lib/firebase";
import { toKoreanFirebaseError } from "@/lib/firebase-errors";
import { validatePopupNotice, validatePopupNoticeImageFile, type PopupNotice } from "@/data/popup-notices";

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

function fileExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function imageContentType(file: File) {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  if (allowedTypes.includes(file.type)) {
    return file.type === "image/jpg" ? "image/jpeg" : file.type;
  }
  const extension = fileExtension(file.name);
  if (extension === "png") {
    return "image/png";
  }
  if (extension === "gif") {
    return "image/gif";
  }
  if (extension === "webp") {
    return "image/webp";
  }
  return "image/jpeg";
}

function toPopupNotice(id: string, data: Record<string, unknown>): PopupNotice | null {
  const title = String(data.title ?? "").trim();
  const body = String(data.body ?? "").trim();
  const startDate = String(data.startDate ?? "");
  const endDate = String(data.endDate ?? "");
  const imageUrl = String(data.imageUrl ?? "").trim();
  const storagePath = String(data.storagePath ?? "").trim();
  if (!title) {
    return null;
  }
  const notice: PopupNotice = {
    id,
    title,
    body,
    imageUrl,
    storagePath,
    enabled: data.enabled !== false,
    startDate,
    endDate,
    updatedAtMs: toMillis(data.updatedAt),
  };
  return validatePopupNotice(notice) ? null : notice;
}

async function deletePopupNoticeImage(storagePath: string) {
  if (!storagePath.startsWith("popup-notices/")) {
    return;
  }
  try {
    await deleteObject(ref(getFirebaseStorage(), storagePath));
  } catch {
    // 공지 저장이 먼저이므로, 파일이 이미 없어도 넘어갑니다.
  }
}

export async function uploadPopupNoticeImage(noticeId: string, file: File) {
  const fileError = validatePopupNoticeImageFile(file);
  if (fileError) {
    throw new Error(fileError);
  }
  await ensureStorageAuth();
  const extension = fileExtension(file.name) || "jpg";
  const fileName = `${Date.now()}.${extension}`;
  const storagePath = `popup-notices/${noticeId.trim()}/${fileName}`;
  const storageRef = ref(getFirebaseStorage(), storagePath);
  try {
    await uploadBytes(storageRef, file, { contentType: imageContentType(file) });
  } catch (error) {
    throw new Error(toKoreanFirebaseError(error, "사진을 올리지 못했습니다. Firebase Storage가 켜져 있는지 확인해 주세요."));
  }
  return {
    imageUrl: await getDownloadURL(storageRef),
    storagePath,
  };
}

export async function listPopupNotices() {
  const snapshot = await getDocs(collection(getFirebaseDb(), NOTICE_COLLECTION));
  return snapshot.docs
    .map((item) => toPopupNotice(item.id, item.data() as Record<string, unknown>))
    .filter((item): item is PopupNotice => item !== null)
    .sort((left, right) => right.updatedAtMs - left.updatedAtMs || left.title.localeCompare(right.title, "ko"));
}

export async function savePopupNotice(input: PopupNotice, imageFile?: File | null, storagePathToDelete = "") {
  const noticeId = input.id.trim();
  let imageUrl = input.imageUrl.trim();
  let storagePath = input.storagePath.trim();

  if (imageFile) {
    const uploaded = await uploadPopupNoticeImage(noticeId, imageFile);
    if (storagePath && storagePath !== uploaded.storagePath) {
      await deletePopupNoticeImage(storagePath);
    }
    if (storagePathToDelete && storagePathToDelete !== uploaded.storagePath) {
      await deletePopupNoticeImage(storagePathToDelete);
    }
    imageUrl = uploaded.imageUrl;
    storagePath = uploaded.storagePath;
  } else if (storagePathToDelete) {
    await deletePopupNoticeImage(storagePathToDelete);
  }

  const noticeToSave: PopupNotice = {
    ...input,
    id: noticeId,
    title: input.title.trim(),
    body: input.body.trim(),
    imageUrl,
    storagePath,
  };
  const errorMessage = validatePopupNotice(noticeToSave);
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  await setDoc(doc(getFirebaseDb(), NOTICE_COLLECTION, noticeId), {
    id: noticeId,
    title: noticeToSave.title,
    body: noticeToSave.body,
    imageUrl: noticeToSave.imageUrl,
    storagePath: noticeToSave.storagePath,
    enabled: noticeToSave.enabled,
    startDate: noticeToSave.startDate,
    endDate: noticeToSave.endDate,
    updatedAt: serverTimestamp(),
  });
}

export async function removePopupNotice(noticeId: string, storagePath = "") {
  if (!noticeId) {
    throw new Error("삭제할 팝업 공지를 찾지 못했습니다.");
  }
  await deleteDoc(doc(getFirebaseDb(), NOTICE_COLLECTION, noticeId));
  await deletePopupNoticeImage(storagePath);
}
