"use client";

import { AdminBoardPostsView } from "@/components/admin/AdminBoardPostsView";
import {
  BOARD_GROUPS,
  BOARD_READ_ROLES,
  BOARD_READ_ROLE_LABELS,
  BOARD_SKINS,
  BOARD_SKIN_LABELS,
  BOARD_WRITE_ROLES,
  BOARD_WRITE_ROLE_LABELS,
  adminBoardPostsPath,
  boardPublicPath,
  type BoardConfig,
} from "@/data/boards";
import { toKoreanFirebaseError } from "@/lib/firebase-errors";
import { listBoardsOrSeed, removeBoard, saveBoard, saveSelectedBoards, validateBoardInput } from "@/lib/boards";
import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const EMPTY_FORM: BoardConfig = {
  id: "",
  group: "커뮤니티",
  title: "",
  description: "",
  skin: "list",
  order: 60,
  readRole: "site",
  writeRole: "site",
  commentEnabled: true,
  searchEnabled: true,
  hidden: false,
};

export default function AdminBoardsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--text-muted)]">게시판을 불러오는 중입니다.</p>}>
      <AdminBoardsGate />
    </Suspense>
  );
}

function AdminBoardsGate() {
  const searchParams = useSearchParams();
  const boardId = (searchParams.get("board") ?? "").trim();
  if (boardId) {
    return <AdminBoardPostsView boardId={boardId} />;
  }
  return <AdminBoardsList />;
}

function AdminBoardsList() {
  const [boards, setBoards] = useState<BoardConfig[]>([]);
  const [drafts, setDrafts] = useState<BoardConfig[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form, setForm] = useState<BoardConfig>(EMPTY_FORM);
  const [keyword, setKeyword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadBoards = async () => {
    const nextBoards = await listBoardsOrSeed();
    setBoards(nextBoards);
    setDrafts(nextBoards);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const nextBoards = await listBoardsOrSeed();
        if (cancelled) return;
        setBoards(nextBoards);
        setDrafts(nextBoards);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(toKoreanFirebaseError(error, "게시판 목록을 불러오지 못했습니다."));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleBoards = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    if (!needle) return drafts;
    return drafts.filter((board) => `${board.id} ${board.title} ${board.group}`.toLowerCase().includes(needle));
  }, [drafts, keyword]);

  const updateDraft = (boardId: string, patch: Partial<BoardConfig>) => {
    setDrafts((current) => current.map((board) => (board.id === boardId ? { ...board, ...patch } : board)));
  };

  const onAddBoard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const boardToSave = {
      ...form,
      id: form.id.trim().toLowerCase(),
      order: Number(form.order) || 60,
    };
    const validationMessage = validateBoardInput(boardToSave);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }
    if (boards.some((board) => board.id === boardToSave.id)) {
      setErrorMessage("이미 있는 게시판 ID입니다.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      await saveBoard(boardToSave);
      await loadBoards();
      setForm({ ...EMPTY_FORM, order: boardToSave.order + 10 });
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "게시판을 추가하지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  const onSaveSelected = async () => {
    const selected = drafts.filter((board) => selectedIds.includes(board.id));
    setIsSaving(true);
    setErrorMessage("");
    try {
      await saveSelectedBoards(selected);
      await loadBoards();
      setSelectedIds([]);
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "선택한 게시판을 저장하지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  const onDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      setErrorMessage("먼저 게시판을 선택해 주세요.");
      return;
    }
    if (!window.confirm(`선택한 ${selectedIds.length}개 게시판과 그 안의 글을 삭제할까요?`)) {
      return;
    }
    setErrorMessage("");
    try {
      for (const boardId of selectedIds) {
        await removeBoard(boardId);
      }
      await loadBoards();
      setSelectedIds([]);
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "게시판을 삭제하지 못했습니다."));
    }
  };

  const onDeleteOne = async (board: BoardConfig) => {
    if (!window.confirm(`"${board.title}" 게시판과 글을 삭제할까요?`)) {
      return;
    }
    setErrorMessage("");
    try {
      await removeBoard(board.id);
      await loadBoards();
      setSelectedIds((current) => current.filter((id) => id !== board.id));
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "게시판을 삭제하지 못했습니다."));
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">게시판 관리</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            공지, 라운지, 갤러리처럼 글을 올리는 게시판을 만듭니다. 읽기/쓰기 등급을 바꾼 뒤에는 체크하고 선택수정을 누르세요. 글 삭제·공지 고정은 각 게시판의 글 관리에서 합니다. 쓰기 등급 ‘모두’는 로그인 없이 글·댓글이 가능해서 스팸이 올라올 수 있습니다. 신편입생 게시판에만 쓰는 것을 권합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void onSaveSelected()} disabled={isSaving || selectedIds.length === 0} className="rounded-full border border-[var(--line)] px-3 py-2 text-sm disabled:opacity-50">
            선택수정
          </button>
          <button type="button" onClick={() => void onDeleteSelected()} className="rounded-full border border-[var(--line)] px-3 py-2 text-sm">
            선택삭제
          </button>
        </div>
      </div>

      <p className="text-sm text-[var(--text-muted)]">생성된 게시판 {boards.length}개</p>
      <input
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="ID, 제목, 그룹 검색"
        className="rounded-full border border-[var(--line)] bg-transparent px-4 py-2 text-sm"
      />

      <form onSubmit={onAddBoard} className="glass-card grid gap-3 rounded-3xl p-5 md:grid-cols-2">
        <p className="md:col-span-2 font-medium">게시판 추가</p>
        <label className="grid gap-1 text-sm">
          ID
          <input value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2" placeholder="free" />
        </label>
        <label className="grid gap-1 text-sm">
          제목
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2" />
        </label>
        <label className="md:col-span-2 grid gap-1 text-sm">
          설명
          <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          그룹
          <select value={form.group} onChange={(event) => setForm({ ...form, group: event.target.value as BoardConfig["group"] })} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2">
            {BOARD_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          스킨
          <select value={form.skin} onChange={(event) => setForm({ ...form, skin: event.target.value as BoardConfig["skin"] })} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2">
            {BOARD_SKINS.map((skin) => (
              <option key={skin} value={skin}>
                {BOARD_SKIN_LABELS[skin]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          읽기 권한
          <select value={form.readRole} onChange={(event) => setForm({ ...form, readRole: event.target.value as BoardConfig["readRole"] })} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2">
            {BOARD_READ_ROLES.map((role) => (
              <option key={role} value={role}>
                {BOARD_READ_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          쓰기 권한
          <select value={form.writeRole} onChange={(event) => setForm({ ...form, writeRole: event.target.value as BoardConfig["writeRole"] })} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2">
            {BOARD_WRITE_ROLES.map((role) => (
              <option key={role} value={role}>
                {BOARD_WRITE_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          출력 순서
          <input type="number" min={1} max={999} value={form.order} onChange={(event) => setForm({ ...form, order: Number(event.target.value) })} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.commentEnabled} onChange={(event) => setForm({ ...form, commentEnabled: event.target.checked })} />
          댓글 사용
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.searchEnabled} onChange={(event) => setForm({ ...form, searchEnabled: event.target.checked })} />
          검색 사용
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.hidden} onChange={(event) => setForm({ ...form, hidden: event.target.checked })} />
          메뉴에서 숨김
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={isSaving} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950 disabled:opacity-60">
            {isSaving ? "저장 중..." : "게시판 추가"}
          </button>
        </div>
      </form>

      {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
      {isLoading ? <p className="text-sm text-[var(--text-muted)]">게시판 목록을 불러오는 중입니다.</p> : null}

      <div className="overflow-x-auto rounded-3xl border border-[var(--line)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-black/5 text-xs text-[var(--text-muted)] dark:bg-white/5">
            <tr>
              <th className="px-3 py-3">선택</th>
              <th className="px-3 py-3">그룹</th>
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">제목</th>
              <th className="px-3 py-3">스킨</th>
              <th className="px-3 py-3">읽기/쓰기</th>
              <th className="px-3 py-3">순서</th>
              <th className="px-3 py-3">댓글/검색/숨김</th>
              <th className="px-3 py-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {visibleBoards.map((board) => (
              <tr key={board.id} className="border-t border-[var(--line)]">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(board.id)}
                    onChange={() =>
                      setSelectedIds((current) => (current.includes(board.id) ? current.filter((id) => id !== board.id) : [...current, board.id]))
                    }
                    aria-label={`${board.title} 선택`}
                  />
                </td>
                <td className="px-3 py-3">
                  <select value={board.group} onChange={(event) => updateDraft(board.id, { group: event.target.value as BoardConfig["group"] })} className="rounded-xl border border-[var(--line)] bg-transparent px-2 py-1">
                    {BOARD_GROUPS.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3 font-mono text-xs">{board.id}</td>
                <td className="px-3 py-3">
                  <input value={board.title} onChange={(event) => updateDraft(board.id, { title: event.target.value })} className="w-36 rounded-xl border border-[var(--line)] bg-transparent px-2 py-1" />
                </td>
                <td className="px-3 py-3">
                  <select value={board.skin} onChange={(event) => updateDraft(board.id, { skin: event.target.value as BoardConfig["skin"] })} className="rounded-xl border border-[var(--line)] bg-transparent px-2 py-1">
                    {BOARD_SKINS.map((skin) => (
                      <option key={skin} value={skin}>
                        {BOARD_SKIN_LABELS[skin]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3">
                  <div className="grid gap-1">
                    <select value={board.readRole} onChange={(event) => updateDraft(board.id, { readRole: event.target.value as BoardConfig["readRole"] })} className="rounded-xl border border-[var(--line)] bg-transparent px-2 py-1">
                      {BOARD_READ_ROLES.map((role) => (
                        <option key={role} value={role}>
                          읽기 {BOARD_READ_ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                    <select value={board.writeRole} onChange={(event) => updateDraft(board.id, { writeRole: event.target.value as BoardConfig["writeRole"] })} className="rounded-xl border border-[var(--line)] bg-transparent px-2 py-1">
                      {BOARD_WRITE_ROLES.map((role) => (
                        <option key={role} value={role}>
                          쓰기 {BOARD_WRITE_ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <input type="number" min={1} max={999} value={board.order} onChange={(event) => updateDraft(board.id, { order: Number(event.target.value) })} className="w-20 rounded-xl border border-[var(--line)] bg-transparent px-2 py-1" />
                </td>
                <td className="px-3 py-3">
                  <div className="grid gap-1 text-xs">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={board.commentEnabled} onChange={(event) => updateDraft(board.id, { commentEnabled: event.target.checked })} />
                      댓글
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={board.searchEnabled} onChange={(event) => updateDraft(board.id, { searchEnabled: event.target.checked })} />
                      검색
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={board.hidden} onChange={(event) => updateDraft(board.id, { hidden: event.target.checked })} />
                      숨김
                    </label>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1">
                    <Link href={adminBoardPostsPath(board.id)} className="rounded-full bg-cyan-500 px-3 py-1 text-center text-xs font-semibold text-navy-950">
                      글 관리
                    </Link>
                    <Link href={boardPublicPath(board.id)} className="rounded-full bg-cyan-500/15 px-3 py-1 text-center text-xs font-medium text-cyan-800 dark:text-cyan-glow">
                      보기
                    </Link>
                    <button type="button" onClick={() => void onDeleteOne(board)} className="rounded-full border border-[var(--line)] px-3 py-1 text-xs">
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && visibleBoards.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--text-muted)]">조건에 맞는 게시판이 없습니다.</p>
        ) : null}
      </div>
    </div>
  );
}
