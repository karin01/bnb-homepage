import { Timestamp, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ensureStorageAuth, getFirebaseDb, getFirebaseStorage } from "@/lib/firebase";
import { toKoreanFirebaseError } from "@/lib/firebase-errors";
import { isBoardId, isGuestAuthorId, MAX_GALLERY_IMAGES, type BoardComment, type BoardPost, type PostImage } from "@/data/boards";
import { assertGuestAccess } from "@/lib/guest-guard-client";

const POST_COLLECTION = "posts";
const COMMENT_COLLECTION = "comments";
const MAX_GALLERY_IMAGE_BYTES = 8 * 1024 * 1024;
const GALLERY_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"];

export type GalleryDraftImage = PostImage & {
  file?: File | null;
};

function fileExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function validateGalleryImageFile(file: File) {
  if (file.size <= 0 || file.size > MAX_GALLERY_IMAGE_BYTES) {
    return "사진은 8MB 이하만 올릴 수 있습니다.";
  }
  if (!GALLERY_IMAGE_EXTENSIONS.includes(fileExtension(file.name))) {
    return "JPG, PNG, GIF, WEBP 사진만 올릴 수 있습니다.";
  }
  return "";
}

function imageContentType(file: File) {
  const extension = fileExtension(file.name);
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  if (allowedTypes.includes(file.type)) {
    return file.type;
  }
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

function isHttpUrl(value: string) {
  return /^https?:\/\/\S+$/i.test(value);
}

function toPostImages(data: Record<string, unknown>, fallbackUrl: string, fallbackPath: string): PostImage[] {
  const raw = data.images;
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const row = item as Record<string, unknown>;
        const imageUrl = String(row.imageUrl ?? "").trim();
        const storagePath = String(row.storagePath ?? "").trim();
        if (!imageUrl) {
          return null;
        }
        return { imageUrl, storagePath };
      })
      .filter((item): item is PostImage => item !== null)
      .slice(0, MAX_GALLERY_IMAGES);
  }
  if (fallbackUrl) {
    return [{ imageUrl: fallbackUrl, storagePath: fallbackPath }];
  }
  return [];
}

export async function uploadPostImage(postId: string, file: File, authorUid: string, index = 0) {
  const fileError = validateGalleryImageFile(file);
  if (fileError) {
    throw new Error(fileError);
  }
  if (!postId.trim() || postId.trim().length > 40) {
    throw new Error("글을 저장할 위치를 찾지 못했습니다.");
  }
  if (!authorUid) {
    throw new Error("로그인 후 사진을 올려 주세요.");
  }

  await ensureStorageAuth();

  const extension = fileExtension(file.name) || "jpg";
  const fileName = `${Date.now()}-${index}.${extension}`;
  const storagePath = `posts/${postId.trim()}/${fileName}`;
  const storageRef = ref(getFirebaseStorage(), storagePath);
  try {
    await uploadBytes(storageRef, file, {
      contentType: imageContentType(file),
    });
  } catch (error) {
    throw new Error(toKoreanFirebaseError(error, "사진을 올리지 못했습니다. Firebase Storage가 켜져 있는지 확인해 주세요."));
  }
  const imageUrl = await getDownloadURL(storageRef);
  return { imageUrl, storagePath };
}

async function deletePostImage(storagePath: string) {
  if (!storagePath.startsWith("posts/")) {
    return;
  }
  try {
    await deleteObject(ref(getFirebaseStorage(), storagePath));
  } catch {
    // 글은 지웠으므로, 파일이 이미 없어도 삭제는 성공으로 봅니다.
  }
}

async function deleteRemovedImages(previous: PostImage[], next: PostImage[]) {
  const kept = new Set(next.map((item) => item.storagePath).filter(Boolean));
  for (const item of previous) {
    if (item.storagePath && !kept.has(item.storagePath)) {
      await deletePostImage(item.storagePath);
    }
  }
}

function toIsoDate(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return new Date().toISOString();
}

function toPost(id: string, data: Record<string, unknown>): BoardPost | null {
  const boardId = String(data.boardId ?? "");
  const title = String(data.title ?? "").trim();
  const body = String(data.body ?? "").trim();
  const authorUid = String(data.authorUid ?? "");
  const authorName = String(data.authorName ?? "").trim();
  if (!isBoardId(boardId) || !title || !body || !authorUid || !authorName) {
    return null;
  }

  const imageUrl = String(data.imageUrl ?? "").trim();
  const storagePath = String(data.storagePath ?? "").trim();
  const images = toPostImages(data, imageUrl, storagePath);

  return {
    id,
    boardId,
    title,
    body,
    authorUid,
    authorName,
    isNotice: data.isNotice === true,
    imageUrl: images[0]?.imageUrl || imageUrl,
    storagePath: images[0]?.storagePath || storagePath,
    images,
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt),
  };
}

function toComment(id: string, data: Record<string, unknown>): BoardComment | null {
  const boardId = String(data.boardId ?? "");
  const postId = String(data.postId ?? "");
  const body = String(data.body ?? "").trim();
  const authorUid = String(data.authorUid ?? "");
  const authorName = String(data.authorName ?? "").trim();
  if (!isBoardId(boardId) || !postId || !body || !authorUid || !authorName) {
    return null;
  }

  return {
    id,
    boardId,
    postId,
    body,
    authorUid,
    authorName,
    createdAt: toIsoDate(data.createdAt),
  };
}

export function validatePostInput(input: Pick<BoardPost, "boardId" | "title" | "body"> & { images?: GalleryDraftImage[]; maxImages?: number }) {
  if (!isBoardId(input.boardId)) {
    return "게시판을 찾을 수 없습니다.";
  }
  if (!input.title.trim() || input.title.trim().length > 80) {
    return "제목은 1~80자로 입력해 주세요.";
  }
  if (!input.body.trim() || input.body.trim().length > 8000) {
    return "본문은 1~8000자로 입력해 주세요.";
  }
  const images = input.images ?? [];
  const maxImages = input.maxImages ?? MAX_GALLERY_IMAGES;
  if (images.length > maxImages) {
    return maxImages === 1
      ? "이 게시판에는 사진을 1장만 올릴 수 있습니다."
      : `사진은 글당 ${maxImages}장까지 올릴 수 있습니다.`;
  }
  for (const image of images) {
    if (image.file) {
      const fileError = validateGalleryImageFile(image.file);
      if (fileError) {
        return fileError;
      }
      continue;
    }
    if (!image.imageUrl.trim()) {
      return "사진 주소를 확인해 주세요.";
    }
    if (image.imageUrl.trim().length > 800) {
      return "이미지 주소가 너무 깁니다.";
    }
    if (!isHttpUrl(image.imageUrl.trim())) {
      return "이미지 주소는 http 또는 https로 시작해 주세요.";
    }
  }
  return "";
}

export function validateGalleryUrl(imageUrl: string) {
  const trimmed = imageUrl.trim();
  if (!trimmed) {
    return "이미지 주소를 입력해 주세요.";
  }
  if (trimmed.length > 800) {
    return "이미지 주소가 너무 깁니다.";
  }
  if (!isHttpUrl(trimmed)) {
    return "이미지 주소는 http 또는 https로 시작해 주세요.";
  }
  return "";
}

export function validateCommentInput(body: string) {
  if (!body.trim() || body.trim().length > 500) {
    return "댓글은 1~500자로 입력해 주세요.";
  }
  return "";
}

export async function listPosts(boardId: string) {
  const snapshot = await getDocs(query(collection(getFirebaseDb(), POST_COLLECTION), where("boardId", "==", boardId)));
  return snapshot.docs
    .map((item) => toPost(item.id, item.data() as Record<string, unknown>))
    .filter((item): item is BoardPost => item !== null)
    .sort((left, right) => {
      if (left.isNotice !== right.isNotice) {
        return left.isNotice ? -1 : 1;
      }
      return right.createdAt.localeCompare(left.createdAt);
    });
}

export async function readPost(postId: string) {
  const snapshot = await getDoc(doc(getFirebaseDb(), POST_COLLECTION, postId));
  if (!snapshot.exists()) {
    return null;
  }
  return toPost(snapshot.id, snapshot.data() as Record<string, unknown>);
}

export async function savePost(input: {
  id?: string;
  boardId: string;
  title: string;
  body: string;
  images?: GalleryDraftImage[];
  maxImages?: number;
  isNotice: boolean;
  authorUid: string;
  authorName: string;
}) {
  const validationMessage = validatePostInput({
    boardId: input.boardId,
    title: input.title,
    body: input.body,
    images: input.images,
    maxImages: input.maxImages,
  });
  if (validationMessage) {
    throw new Error(validationMessage);
  }
  if (!input.authorUid || !input.authorName.trim()) {
    throw new Error("작성자 이름을 확인해 주세요.");
  }
  if (isGuestAuthorId(input.authorUid) && (input.images ?? []).some((image) => Boolean(image.file))) {
    throw new Error("비가입자는 파일을 올릴 수 없습니다. 공개 이미지 주소만 넣어 주세요.");
  }
  if (isGuestAuthorId(input.authorUid) && input.isNotice) {
    throw new Error("비가입자는 공지를 올릴 수 없습니다.");
  }
  if (isGuestAuthorId(input.authorUid)) {
    await assertGuestAccess("post");
  }

  const db = getFirebaseDb();
  const postId = input.id?.trim() || `post-${Date.now()}`;
  const existing = input.id ? await readPost(postId) : null;
  const now = Timestamp.now();
  const savedImages: PostImage[] = [];

  for (const [index, image] of (input.images ?? []).entries()) {
    if (image.file) {
      savedImages.push(await uploadPostImage(postId, image.file, input.authorUid, index));
      continue;
    }
    savedImages.push({
      imageUrl: image.imageUrl.trim(),
      storagePath: image.storagePath.trim(),
    });
  }

  const imageUrl = savedImages[0]?.imageUrl ?? "";
  const storagePath = savedImages[0]?.storagePath ?? "";

  if (existing) {
    await updateDoc(doc(db, POST_COLLECTION, postId), {
      title: input.title.trim(),
      body: input.body.trim(),
      isNotice: input.isNotice,
      imageUrl,
      storagePath,
      images: savedImages,
      updatedAt: now,
    });
    await deleteRemovedImages(existing.images, savedImages);
    return postId;
  }

  await setDoc(doc(db, POST_COLLECTION, postId), {
    id: postId,
    boardId: input.boardId,
    title: input.title.trim(),
    body: input.body.trim(),
    authorUid: input.authorUid,
    authorName: input.authorName.trim(),
    isNotice: input.isNotice,
    imageUrl,
    storagePath,
    images: savedImages,
    createdAt: now,
    updatedAt: now,
  });

  return postId;
}

async function listCommentsForPost(postId: string) {
  const snapshot = await getDocs(query(collection(getFirebaseDb(), COMMENT_COLLECTION), where("postId", "==", postId)));
  return snapshot.docs.map((item) => item.id);
}

async function listPostsForBoard(boardId: string) {
  const snapshot = await getDocs(query(collection(getFirebaseDb(), POST_COLLECTION), where("boardId", "==", boardId)));
  return snapshot.docs.map((item) => item.id);
}

export async function removePost(postId: string) {
  const existing = await readPost(postId);
  const db = getFirebaseDb();
  const commentIds = await listCommentsForPost(postId);
  const batch = writeBatch(db);
  commentIds.forEach((commentId) => {
    batch.delete(doc(db, COMMENT_COLLECTION, commentId));
  });
  batch.delete(doc(db, POST_COLLECTION, postId));
  await batch.commit();
  await deleteRemovedImages(existing?.images ?? [], []);
}

export async function updatePostNotice(postId: string, isNotice: boolean) {
  const existing = await readPost(postId);
  if (!existing) {
    throw new Error("글을 찾을 수 없습니다.");
  }
  await updateDoc(doc(getFirebaseDb(), POST_COLLECTION, postId), {
    isNotice,
    updatedAt: Timestamp.now(),
  });
}

export async function removeSelectedPosts(postIds: string[]) {
  if (postIds.length === 0) {
    throw new Error("먼저 글을 선택해 주세요.");
  }
  for (const postId of postIds) {
    await removePost(postId);
  }
}

export async function removePostsByBoard(boardId: string) {
  const postIds = await listPostsForBoard(boardId);
  for (const postId of postIds) {
    await removePost(postId);
  }
}

export async function listComments(postId: string) {
  const snapshot = await getDocs(query(collection(getFirebaseDb(), COMMENT_COLLECTION), where("postId", "==", postId)));
  return snapshot.docs
    .map((item) => toComment(item.id, item.data() as Record<string, unknown>))
    .filter((item): item is BoardComment => item !== null)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function saveComment(input: {
  boardId: string;
  postId: string;
  body: string;
  authorUid: string;
  authorName: string;
}) {
  const validationMessage = validateCommentInput(input.body);
  if (validationMessage) {
    throw new Error(validationMessage);
  }
  if (!isBoardId(input.boardId) || !input.postId) {
    throw new Error("글을 찾을 수 없습니다.");
  }
  if (!input.authorUid || !input.authorName.trim()) {
    throw new Error("작성자 이름을 확인해 주세요.");
  }
  if (isGuestAuthorId(input.authorUid)) {
    await assertGuestAccess("comment");
  }

  const commentId = `cmt-${Date.now()}`;
  await setDoc(doc(getFirebaseDb(), COMMENT_COLLECTION, commentId), {
    id: commentId,
    boardId: input.boardId,
    postId: input.postId,
    body: input.body.trim(),
    authorUid: input.authorUid,
    authorName: input.authorName.trim(),
    createdAt: Timestamp.now(),
  });
  return commentId;
}

export async function removeComment(commentId: string) {
  await deleteDoc(doc(getFirebaseDb(), COMMENT_COLLECTION, commentId));
}
