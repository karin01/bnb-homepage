"use client";

import { useMembership } from "@/components/providers/MembershipProvider";
import { PageHero } from "@/components/ui/PageHero";
import {
  boardPublicPath,
  canAccessBoard,
  canWriteOnBoard,
  formatPostDate,
  listPostImageUrls,
  postCoverUrl,
  type BoardConfig,
  type BoardPost,
} from "@/data/boards";
import { toKoreanFirebaseError } from "@/lib/firebase-errors";
import { readBoard } from "@/lib/boards";
import { listPosts } from "@/lib/posts";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export function BoardPostList({ boardId }: { boardId: string }) {
  const { membership, role, isAdmin } = useMembership();
  const [board, setBoard] = useState<BoardConfig | null>(null);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [keyword, setKeyword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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
        if (!canAccessBoard(role, nextBoard.readRole, isAdmin)) {
          setPosts([]);
          setIsLoading(false);
          return;
        }
        const nextPosts = await listPosts(boardId);
        if (cancelled) return;
        setPosts(nextPosts);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(toKoreanFirebaseError(error, "게시글을 불러오지 못했습니다."));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [boardId, isAdmin, role]);

  const visiblePosts = useMemo(() => {
    if (!board?.searchEnabled) return posts;
    const needle = keyword.trim().toLowerCase();
    if (!needle) return posts;
    return posts.filter((post) => `${post.title} ${post.body} ${post.authorName}`.toLowerCase().includes(needle));
  }, [board?.searchEnabled, keyword, posts]);

  if (!isLoading && !board) {
    return (
      <section className="mx-auto max-w-4xl px-5 py-16">
        <p className="text-sm text-[var(--text-muted)]">없는 게시판입니다.</p>
      </section>
    );
  }

  if (board && !canAccessBoard(role, board.readRole, isAdmin)) {
    return (
      <>
        <PageHero eyebrow={board.group} title={board.title} description={board.description} />
        <section className="mx-auto max-w-4xl px-5 py-16">
          <p className="text-sm text-[var(--text-muted)]">이 게시판은 로그인한 회원만 볼 수 있습니다.</p>
          <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-cyan-700 dark:text-cyan-glow">
            로그인하기
          </Link>
        </section>
      </>
    );
  }

  const canWrite = board ? canWriteOnBoard(role, board.writeRole, isAdmin, membership === "member") : false;

  return (
    <>
      <PageHero eyebrow={board?.group ?? "Community"} title={board?.title ?? "게시판"} description={board?.description ?? ""} />
      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {board?.searchEnabled ? (
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="제목, 본문, 작성자 검색"
              className="rounded-full border border-[var(--line)] bg-transparent px-4 py-2 text-sm md:w-80"
            />
          ) : (
            <span />
          )}
          <div className="flex flex-wrap gap-2">
            {isAdmin ? (
              <Link href={`/admin/boards/${boardId}`} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
                글 관리
              </Link>
            ) : null}
            {canWrite ? (
              <Link href={`${boardPublicPath(boardId)}/write`} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950">
                글쓰기
              </Link>
            ) : null}
            {board?.writeRole === "guest" ? (
              <p className="w-full text-xs text-[var(--text-muted)] md:w-auto">가입 전에도 글과 댓글을 남길 수 있습니다. 해외 접속과 도배는 기본으로 막습니다.</p>
            ) : null}
          </div>
        </div>
        {errorMessage ? <p className="mb-4 text-sm text-red-500">{errorMessage}</p> : null}
        {isLoading ? <p className="text-sm text-[var(--text-muted)]">글을 불러오는 중입니다.</p> : null}

        {!isLoading && visiblePosts.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">아직 글이 없습니다. 첫 글을 남겨 주세요.</p>
        ) : board?.skin === "gallery" ? (
          <div className="grid gap-4 md:grid-cols-3">
            {visiblePosts.map((post) => {
              const coverUrl = postCoverUrl(post);
              const imageCount = listPostImageUrls(post).length;
              return (
              <Link key={post.id} href={`${boardPublicPath(boardId)}/${post.id}`} className="glass-card overflow-hidden rounded-3xl">
                <div className="relative">
                  {coverUrl ? (
                    // 외부 이미지 주소는 next/image 허용 목록 밖일 수 있어 일반 img를 씁니다.
                    <img src={coverUrl} alt="" className="h-40 w-full object-cover" />
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-cyan-700 to-navy-900" />
                  )}
                  {imageCount > 1 ? (
                    <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                      {imageCount}장
                    </span>
                  ) : null}
                </div>
                <div className="p-4">
                  <p className="text-xs text-[var(--text-muted)]">{formatPostDate(post.createdAt)}</p>
                  <h2 className="mt-1 font-medium">{post.title}</h2>
                </div>
              </Link>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-3">
            {visiblePosts.map((post) => (
              <Link key={post.id} href={`${boardPublicPath(boardId)}/${post.id}`} className="glass-card flex items-center justify-between rounded-2xl p-5">
                <div>
                  {post.isNotice ? <p className="text-xs text-cyan-700 dark:text-cyan-glow">공지</p> : null}
                  <h2 className="font-medium">{post.title}</h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {post.authorName} · {formatPostDate(post.createdAt)}
                    {postCoverUrl(post) ? " · 사진" : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
