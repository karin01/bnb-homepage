import type { MemberRole } from "@/lib/member-roles";

/** 게시판 읽기 권한. guest는 로그인 없이 목록/글을 볼 수 있습니다. */
export const BOARD_READ_ROLES = ["guest", "site", "study", "admin"] as const;
export type BoardReadRole = (typeof BOARD_READ_ROLES)[number];

/** 글쓰기 권한. guest는 로그인 없이 글을 쓸 수 있습니다. */
export const BOARD_WRITE_ROLES = ["guest", "site", "study", "admin"] as const;
export type BoardWriteRole = (typeof BOARD_WRITE_ROLES)[number];

export const BOARD_GROUPS = ["커뮤니티", "자료실"] as const;
export type BoardGroup = (typeof BOARD_GROUPS)[number];

export const BOARD_SKINS = ["list", "gallery"] as const;
export type BoardSkin = (typeof BOARD_SKINS)[number];

export const BOARD_SKIN_LABELS: Record<BoardSkin, string> = {
  list: "목록형",
  gallery: "갤러리",
};

/** 갤러리 글 하나에 올릴 수 있는 사진 수 */
export const MAX_GALLERY_IMAGES = 10;

/** 목록형(공지·라운지 등) 글 하나에 올릴 수 있는 사진 수 */
export const MAX_LIST_IMAGES = 1;

export function maxImagesForSkin(skin: BoardSkin) {
  return skin === "gallery" ? MAX_GALLERY_IMAGES : MAX_LIST_IMAGES;
}

export type PostImage = {
  imageUrl: string;
  storagePath: string;
};

export const BOARD_READ_ROLE_LABELS: Record<BoardReadRole, string> = {
  guest: "모두",
  site: "홈페이지 회원",
  study: "정회원",
  admin: "운영진",
};

export const BOARD_WRITE_ROLE_LABELS: Record<BoardWriteRole, string> = {
  guest: "모두",
  site: "홈페이지 회원",
  study: "정회원",
  admin: "운영진",
};

export type BoardConfig = {
  id: string;
  group: BoardGroup;
  title: string;
  description: string;
  skin: BoardSkin;
  order: number;
  readRole: BoardReadRole;
  writeRole: BoardWriteRole;
  commentEnabled: boolean;
  searchEnabled: boolean;
  hidden: boolean;
};

export type BoardPost = {
  id: string;
  boardId: string;
  title: string;
  body: string;
  authorUid: string;
  authorName: string;
  isNotice: boolean;
  imageUrl: string;
  storagePath: string;
  images: PostImage[];
  createdAt: string;
  updatedAt: string;
};

export type BoardComment = {
  id: string;
  boardId: string;
  postId: string;
  body: string;
  authorUid: string;
  authorName: string;
  createdAt: string;
};

/** 기존 그누보드 커뮤니티에 가깝게 기본 게시판을 둡니다. 학년 자료실은 별도 자료실을 씁니다. */
export const DEFAULT_BOARDS: BoardConfig[] = [
  {
    id: "notice",
    group: "커뮤니티",
    title: "공지·회계",
    description: "오픈수업, OT, 회비 내역처럼 정회원이 알아야 할 안내입니다.",
    skin: "list",
    order: 10,
    readRole: "study",
    writeRole: "admin",
    commentEnabled: true,
    searchEnabled: true,
    hidden: false,
  },
  {
    id: "free",
    group: "커뮤니티",
    title: "BnB 라운지",
    description: "소모임 모집, 학습 후기, 학우들의 자유로운 이야기를 모으는 게시판입니다.",
    skin: "list",
    order: 20,
    readRole: "study",
    writeRole: "study",
    commentEnabled: true,
    searchEnabled: true,
    hidden: false,
  },
  {
    id: "gallery",
    group: "커뮤니티",
    title: "활동 갤러리",
    description: "신년회, OT, MT, 스터디룸의 하루를 사진과 글로 남깁니다.",
    skin: "gallery",
    order: 30,
    readRole: "study",
    writeRole: "study",
    commentEnabled: true,
    searchEnabled: true,
    hidden: false,
  },
  {
    id: "qa",
    group: "커뮤니티",
    title: "신편입생 게시판",
    description: "가입 전에도 질문과 가입 희망을 남길 수 있습니다. 로그인하지 않은 분도 글과 댓글을 쓸 수 있습니다.",
    skin: "list",
    order: 40,
    readRole: "guest",
    writeRole: "guest",
    commentEnabled: true,
    searchEnabled: true,
    hidden: false,
  },
  {
    id: "club",
    group: "커뮤니티",
    title: "소모임 게시판",
    description: "소모임 공지와 모집, 진행 이야기를 남기는 공간입니다.",
    skin: "list",
    order: 50,
    readRole: "study",
    writeRole: "study",
    commentEnabled: true,
    searchEnabled: true,
    hidden: false,
  },
  {
    id: "ops",
    group: "커뮤니티",
    title: "운영 게시판",
    description: "운영진만 보는 내부 공지와 업무 기록입니다.",
    skin: "list",
    order: 90,
    readRole: "admin",
    writeRole: "admin",
    commentEnabled: true,
    searchEnabled: false,
    hidden: true,
  },
];

export function isBoardGroup(value: string): value is BoardGroup {
  return BOARD_GROUPS.includes(value as BoardGroup);
}

export function isBoardSkin(value: string): value is BoardSkin {
  return BOARD_SKINS.includes(value as BoardSkin);
}

export function isBoardReadRole(value: string): value is BoardReadRole {
  return BOARD_READ_ROLES.includes(value as BoardReadRole);
}

export function isBoardWriteRole(value: string): value is BoardWriteRole {
  return BOARD_WRITE_ROLES.includes(value as BoardWriteRole);
}

export function isBoardId(value: string) {
  return /^[a-z][a-z0-9_-]{1,19}$/.test(value);
}

const ROLE_RANK: Record<BoardReadRole, number> = {
  guest: 0,
  site: 1,
  study: 2,
  admin: 3,
};

/** 회비 확인 전에는 너무 열려 있으면 안 되는 기본 게시판 */
const PAID_BOARD_IDS = new Set(["notice", "free", "gallery", "club"]);

/** 이미 있는 게시판이 홈페이지 회원에게 열려 있으면 정회원으로 올립니다. */
export function tightenBoardToPaidRole(board: BoardConfig): BoardConfig {
  if (!PAID_BOARD_IDS.has(board.id)) {
    return board;
  }
  return {
    ...board,
    readRole: board.readRole === "guest" || board.readRole === "site" ? "study" : board.readRole,
    writeRole: board.writeRole === "guest" || board.writeRole === "site" ? "study" : board.writeRole,
  };
}

export function memberRoleToReadRole(role: MemberRole | null): BoardReadRole {
  if (role === "admin") return "admin";
  if (role === "study") return "study";
  if (role === "site") return "site";
  return "guest";
}

export function canAccessBoard(userRole: MemberRole | null, required: BoardReadRole, isAdmin: boolean) {
  if (isAdmin || required === "guest") {
    return true;
  }
  return ROLE_RANK[memberRoleToReadRole(userRole)] >= ROLE_RANK[required];
}

/** 글쓰기 가능 여부. 쓰기 등급이 모두이면 비가입자도 쓸 수 있습니다. */
export function canWriteOnBoard(
  userRole: MemberRole | null,
  writeRole: BoardWriteRole,
  isAdmin: boolean,
  isMember: boolean,
) {
  if (isAdmin) {
    return true;
  }
  if (writeRole === "guest") {
    return true;
  }
  return isMember && canAccessBoard(userRole, writeRole, false);
}

export function createGuestAuthorId() {
  return `guest-${Date.now()}`;
}

export function isGuestAuthorId(value: string) {
  return /^guest-\d{10,20}$/.test(value);
}

export function validateGuestDisplayName(name: string) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 20) {
    return "표시 이름은 1~20자로 입력해 주세요.";
  }
  return "";
}

export function boardPublicPath(boardId: string) {
  return `/community/${boardId}`;
}

/** GitHub Pages는 글마다 HTML을 미리 만들 수 없어, 목록 주소에 글 번호를 붙입니다. */
export function boardPostPath(boardId: string, postId: string) {
  return `${boardPublicPath(boardId)}?post=${encodeURIComponent(postId)}`;
}

export function boardWritePath(boardId: string) {
  return `${boardPublicPath(boardId)}?write=1`;
}

export function boardEditPath(boardId: string, postId: string) {
  return `${boardPublicPath(boardId)}?post=${encodeURIComponent(postId)}&edit=1`;
}

export function adminBoardPostsPath(boardId: string) {
  return `/admin/boards?board=${encodeURIComponent(boardId)}`;
}

export function formatPostDate(isoDate: string) {
  if (!isoDate) return "-";
  return isoDate.slice(0, 10);
}

/** 게시판 위젯용 짧은 날짜. 예: 08-17 */
export function formatPostDateShort(isoDate: string) {
  if (!isoDate || isoDate.length < 10) return "-";
  return isoDate.slice(5, 10);
}

/** 목록 썸네일용 첫 장. 예전 한 장 글도 같이 읽습니다. */
export function postCoverUrl(post: Pick<BoardPost, "imageUrl" | "images">) {
  return (post.images[0]?.imageUrl || post.imageUrl).trim();
}

/** 본문에 보여줄 사진 주소 목록 */
export function listPostImageUrls(post: Pick<BoardPost, "imageUrl" | "images">) {
  const fromList = post.images.map((item) => item.imageUrl.trim()).filter(Boolean);
  if (fromList.length > 0) {
    return fromList;
  }
  return post.imageUrl.trim() ? [post.imageUrl.trim()] : [];
}
