"use client";

import {
  BOARD_READ_ROLES,
  BOARD_READ_ROLE_LABELS,
  BOARD_WRITE_ROLES,
  BOARD_WRITE_ROLE_LABELS,
  boardPostPath,
  formatPostDate,
  postCoverUrl,
  type BoardConfig,
  type BoardPost,
} from "@/data/boards";
import { toKoreanFirebaseError } from "@/lib/firebase-errors";
import { readBoard, saveBoard } from "@/lib/boards";
import { listPosts, removePost, removeSelectedPosts, updatePostNotice } from "@/lib/posts";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export function AdminBoardPostsView({ boardId }: { boardId: string }) {
  const [board, setBoard] = useState<BoardConfig | null>(null);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadPage = async () => {
    const nextBoard = await readBoard(boardId);
    setBoard(nextBoard);
    if (!nextBoard) {
      setPosts([]);
      return;
    }
    setPosts(await listPosts(boardId));
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const nextBoard = await readBoard(boardId);
        if (cancelled) return;
        setBoard(nextBoard);
        if (!nextBoard) {
          setIsLoading(false);
          return;
        }
        const nextPosts = await listPosts(boardId);
        if (cancelled) return;
        setPosts(nextPosts);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(toKoreanFirebaseError(error, "글을 불러오지 못했습니다."));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  const visiblePosts = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    if (!needle) return posts;
    return posts.filter((post) => `${post.title} ${post.body} ${post.authorName}`.toLowerCase().includes(needle));
  }, [keyword, posts]);

  const toggleSelected = (postId: string) => {
    setSelectedIds((current) => (current.includes(postId) ? current.filter((id) => id !== postId) : [...current, postId]));
  };

  const onSaveRoles = async () => {
    if (!board) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      await saveBoard(board);
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "게시판 등급을 저장하지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  const onDeleteOne = async (post: BoardPost) => {
    if (!window.confirm(`"${post.title}" 글을 삭제할까요?`)) return;
    setErrorMessage("");
    try {
      await removePost(post.id);
      await loadPage();
      setSelectedIds((current) => current.filter((id) => id !== post.id));
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "글을 삭제하지 못했습니다."));
    }
  };

  const onDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      setErrorMessage("먼저 글을 선택해 주세요.");
      return;
    }
    if (!window.confirm(`선택한 ${selectedIds.length}개 글을 삭제할까요?`)) return;
    setErrorMessage("");
    try {
      await removeSelectedPosts(selectedIds);
      await loadPage();
      setSelectedIds([]);
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "선택한 글을 삭제하지 못했습니다."));
    }
  };

  const onSetNoticeSelected = async (isNotice: boolean) => {
    if (selectedIds.length === 0) {
      setErrorMessage("먼저 글을 선택해 주세요.");
      return;
    }
    setIsSaving(true);
    setErrorMessage("");
    try {
      for (const postId of selectedIds) {
        await updatePostNotice(postId, isNotice);
      }
      await loadPage();
      setSelectedIds([]);
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "공지 설정을 바꾸지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoading && !board) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-[var(--text-muted)]">없는 게시판입니다.</p>
        <Link href="/admin/boards" className="text-sm text-cyan-700 dark:text-cyan-glow">
          게시판 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/admin/boards" className="text-xs text-cyan-700 dark:text-cyan-glow">
            게시판 관리
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{board?.title ?? "글 관리"}</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            글을 선택해 삭제하거나 공지로 고정할 수 있습니다. 읽기/쓰기 등급은 이 게시판을 누가 보고 쓸 수 있는지 정합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void onSetNoticeSelected(true)} disabled={isSaving || selectedIds.length === 0} className="rounded-full border border-[var(--line)] px-3 py-2 text-sm disabled:opacity-50">
            선택 공지
          </button>
          <button type="button" onClick={() => void onSetNoticeSelected(false)} disabled={isSaving || selectedIds.length === 0} className="rounded-full border border-[var(--line)] px-3 py-2 text-sm disabled:opacity-50">
            공지 해제
          </button>
          <button type="button" onClick={() => void onDeleteSelected()} className="rounded-full border border-[var(--line)] px-3 py-2 text-sm">
            선택삭제
          </button>
        </div>
      </div>

      {board ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onSaveRoles();
          }}
          className="glass-card grid gap-3 rounded-3xl p-5 md:grid-cols-[1fr_1fr_auto] md:items-end"
        >
          <label className="grid gap-1 text-sm">
            읽기 등급
            <select
              value={board.readRole}
              onChange={(event) => setBoard({ ...board, readRole: event.target.value as BoardConfig["readRole"] })}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            >
              {BOARD_READ_ROLES.map((role) => (
                <option key={role} value={role}>
                  {BOARD_READ_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            쓰기 등급
            <select
              value={board.writeRole}
              onChange={(event) => setBoard({ ...board, writeRole: event.target.value as BoardConfig["writeRole"] })}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            >
              {BOARD_WRITE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {BOARD_WRITE_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={isSaving} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950 disabled:opacity-60">
            {isSaving ? "저장 중..." : "등급 저장"}
          </button>
          <p className="md:col-span-3 text-xs text-[var(--text-muted)]">모두 = 손님도 봄·씀 · 사이트 회원 = 가입자 · 정회원 = 입회 확인 후 · 운영진 = 관리자만. 쓰기 모두는 스팸 위험이 있어 신편입생 게시판에만 권합니다.</p>
        </form>
      ) : null}

      <p className="text-sm text-[var(--text-muted)]">글 {posts.length}개</p>
      <input
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="제목, 본문, 작성자 검색"
        className="rounded-full border border-[var(--line)] bg-transparent px-4 py-2 text-sm"
      />

      {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
      {isLoading ? <p className="text-sm text-[var(--text-muted)]">글을 불러오는 중입니다.</p> : null}

      <div className="overflow-x-auto rounded-3xl border border-[var(--line)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-black/5 text-xs text-[var(--text-muted)] dark:bg-white/5">
            <tr>
              <th className="px-3 py-3">선택</th>
              <th className="px-3 py-3">제목</th>
              <th className="px-3 py-3">작성자</th>
              <th className="px-3 py-3">날짜</th>
              <th className="px-3 py-3">상태</th>
              <th className="px-3 py-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {visiblePosts.map((post) => (
              <tr key={post.id} className="border-t border-[var(--line)]">
                <td className="px-3 py-3">
                  <input type="checkbox" checked={selectedIds.includes(post.id)} onChange={() => toggleSelected(post.id)} aria-label={`${post.title} 선택`} />
                </td>
                <td className="px-3 py-3">
                  <p className="font-medium">{post.title}</p>
                  {postCoverUrl(post) ? <p className="text-xs text-[var(--text-muted)]">사진 있음</p> : null}
                </td>
                <td className="px-3 py-3">{post.authorName}</td>
                <td className="px-3 py-3 whitespace-nowrap">{formatPostDate(post.createdAt)}</td>
                <td className="px-3 py-3">{post.isNotice ? "공지" : "일반"}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1">
                    <Link href={boardPostPath(boardId, post.id)} className="rounded-full bg-cyan-500/15 px-3 py-1 text-center text-xs font-medium text-cyan-800 dark:text-cyan-glow">
                      보기
                    </Link>
                    <button type="button" onClick={() => void onDeleteOne(post)} className="rounded-full border border-[var(--line)] px-3 py-1 text-xs">
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && visiblePosts.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--text-muted)]">이 게시판에 글이 없습니다.</p>
        ) : null}
      </div>
    </div>
  );
}
