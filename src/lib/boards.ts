import { Timestamp, collection, deleteDoc, doc, getDoc, getDocs, setDoc, writeBatch } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { removePostsByBoard } from "@/lib/posts";
import {
  DEFAULT_BOARDS,
  isBoardGroup,
  isBoardId,
  isBoardReadRole,
  isBoardSkin,
  isBoardWriteRole,
  tightenBoardToPaidRole,
  type BoardConfig,
} from "@/data/boards";

const BOARD_COLLECTION = "boards";

function toBoard(id: string, data: Record<string, unknown>): BoardConfig | null {
  const group = String(data.group ?? "");
  const title = String(data.title ?? "").trim();
  const description = String(data.description ?? "").trim();
  const skin = String(data.skin ?? "");
  const order = Number(data.order);
  const readRole = String(data.readRole ?? "");
  const writeRole = String(data.writeRole ?? "");
  if (
    !isBoardId(id) ||
    !isBoardGroup(group) ||
    !title ||
    !isBoardSkin(skin) ||
    !Number.isInteger(order) ||
    !isBoardReadRole(readRole) ||
    !isBoardWriteRole(writeRole)
  ) {
    return null;
  }

  return {
    id,
    group,
    title,
    description,
    skin,
    order,
    readRole,
    writeRole,
    commentEnabled: data.commentEnabled !== false,
    searchEnabled: data.searchEnabled !== false,
    hidden: data.hidden === true,
  };
}

export function validateBoardInput(input: BoardConfig) {
  if (!isBoardId(input.id)) {
    return "게시판 ID는 영문 소문자로 시작하고, 영문/숫자/하이픈/밑줄 2~20자로 입력해 주세요.";
  }
  if (!isBoardGroup(input.group)) {
    return "그룹을 선택해 주세요.";
  }
  if (!input.title.trim() || input.title.trim().length > 40) {
    return "게시판 제목은 1~40자로 입력해 주세요.";
  }
  if (input.description.trim().length > 120) {
    return "설명은 120자 이하로 입력해 주세요.";
  }
  if (!isBoardSkin(input.skin)) {
    return "스킨을 선택해 주세요.";
  }
  if (!Number.isInteger(input.order) || input.order < 1 || input.order > 999) {
    return "출력 순서는 1~999 사이 숫자여야 합니다.";
  }
  if (!isBoardReadRole(input.readRole)) {
    return "읽기 권한을 선택해 주세요.";
  }
  if (!isBoardWriteRole(input.writeRole)) {
    return "쓰기 권한을 선택해 주세요.";
  }
  return "";
}

function toFirestoreBoard(input: BoardConfig) {
  return {
    id: input.id.trim(),
    group: input.group,
    title: input.title.trim(),
    description: input.description.trim(),
    skin: input.skin,
    order: input.order,
    readRole: input.readRole,
    writeRole: input.writeRole,
    commentEnabled: input.commentEnabled,
    searchEnabled: input.searchEnabled,
    hidden: input.hidden,
    updatedAt: Timestamp.now(),
  };
}

export async function listBoards() {
  const snapshot = await getDocs(collection(getFirebaseDb(), BOARD_COLLECTION));
  return snapshot.docs
    .map((item) => toBoard(item.id, item.data() as Record<string, unknown>))
    .filter((item): item is BoardConfig => item !== null)
    .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title, "ko"));
}

async function seedDefaultBoardsIfEmpty() {
  const existing = await listBoards();
  if (existing.length > 0) {
    return existing;
  }

  const db = getFirebaseDb();
  const batch = writeBatch(db);
  DEFAULT_BOARDS.forEach((board) => {
    batch.set(doc(db, BOARD_COLLECTION, board.id), toFirestoreBoard(board));
  });
  await batch.commit();
  return DEFAULT_BOARDS;
}

/** 이미 게시판이 있어도, 신편입생 게시판은 비가입자 글쓰기로 맞춰 둡니다. */
async function ensureGuestQaBoard() {
  const qaDefault = DEFAULT_BOARDS.find((board) => board.id === "qa");
  if (!qaDefault) {
    return;
  }

  const existing = await readBoard("qa");
  if (!existing) {
    await setDoc(doc(getFirebaseDb(), BOARD_COLLECTION, qaDefault.id), toFirestoreBoard(qaDefault));
    return;
  }

  const isOldQaTitle = /Q&A|질문/.test(existing.title) && existing.title !== qaDefault.title;
  if (existing.writeRole === "guest" && existing.readRole === "guest" && !isOldQaTitle) {
    return;
  }

  await setDoc(
    doc(getFirebaseDb(), BOARD_COLLECTION, existing.id),
    toFirestoreBoard({
      ...existing,
      title: isOldQaTitle ? qaDefault.title : existing.title,
      description: isOldQaTitle ? qaDefault.description : existing.description,
      readRole: "guest",
      writeRole: "guest",
      hidden: false,
    }),
  );
}

/** 라운지·갤러리처럼 회비 확인 후에만 열어야 하는 게시판 등급을 맞춥니다. */
async function ensurePaidBoardRoles() {
  const existing = await listBoards();
  const updates = existing
    .map((board) => tightenBoardToPaidRole(board))
    .filter((next, index) => next.readRole !== existing[index].readRole || next.writeRole !== existing[index].writeRole);
  if (updates.length === 0) {
    return;
  }
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  updates.forEach((board) => {
    batch.set(doc(db, BOARD_COLLECTION, board.id), toFirestoreBoard(board));
  });
  await batch.commit();
}

export async function listBoardsOrSeed() {
  try {
    await seedDefaultBoardsIfEmpty();
    await ensureGuestQaBoard();
    await ensurePaidBoardRoles();
    return await listBoards();
  } catch {
    return listBoards();
  }
}

export async function readBoard(boardId: string) {
  const snapshot = await getDoc(doc(getFirebaseDb(), BOARD_COLLECTION, boardId));
  if (!snapshot.exists()) {
    return null;
  }
  return toBoard(snapshot.id, snapshot.data() as Record<string, unknown>);
}

export async function saveBoard(input: BoardConfig) {
  const validationMessage = validateBoardInput(input);
  if (validationMessage) {
    throw new Error(validationMessage);
  }

  await setDoc(doc(getFirebaseDb(), BOARD_COLLECTION, input.id.trim()), toFirestoreBoard(input));
  return input;
}

export async function saveSelectedBoards(boards: BoardConfig[]) {
  if (boards.length === 0) {
    throw new Error("선택한 게시판이 없습니다.");
  }

  for (const board of boards) {
    const validationMessage = validateBoardInput(board);
    if (validationMessage) {
      throw new Error(`${board.title}: ${validationMessage}`);
    }
  }

  const db = getFirebaseDb();
  const batch = writeBatch(db);
  boards.forEach((board) => {
    batch.set(doc(db, BOARD_COLLECTION, board.id.trim()), toFirestoreBoard(board));
  });
  await batch.commit();
}

export async function removeBoard(boardId: string) {
  if (!isBoardId(boardId)) {
    throw new Error("게시판 ID가 올바르지 않습니다.");
  }
  await removePostsByBoard(boardId);
  await deleteDoc(doc(getFirebaseDb(), BOARD_COLLECTION, boardId));
}
