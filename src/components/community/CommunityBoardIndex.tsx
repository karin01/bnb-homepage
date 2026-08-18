"use client";

import { useMembership } from "@/components/providers/MembershipProvider";
import { PageHero } from "@/components/ui/PageHero";
import {
  boardPublicPath,
  canAccessBoard,
  canWriteOnBoard,
  formatPostDateShort,
  postCoverUrl,
  type BoardConfig,
  type BoardPost,
} from "@/data/boards";
import { toKoreanFirebaseError } from "@/lib/firebase-errors";
import { listBoards } from "@/lib/boards";
import { listPosts } from "@/lib/posts";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const PREVIEW_POST_COUNT = 6;

type BoardPreview = {
  board: BoardConfig;
  posts: BoardPost[];
};

export function CommunityBoardIndex() {
  const { membership, uid, role, isAdmin } = useMembership();
  const [previews, setPreviews] = useState<BoardPreview[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const boards = (await listBoards()).filter((board) => !board.hidden && canAccessBoard(role, board.readRole, isAdmin));
        const rows = await Promise.all(
          boards.map(async (board) => {
            try {
              const posts = (await listPosts(board.id)).slice(0, PREVIEW_POST_COUNT);
              return { board, posts };
            } catch {
              return { board, posts: [] as BoardPost[] };
            }
          }),
        );
        if (!cancelled) {
          setPreviews(rows);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(toKoreanFirebaseError(error, "게시판 목록을 불러오지 못했습니다."));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, role]);

  return (
    <>
      <PageHero
        compact
        eyebrow="Community"
        title="커뮤니티"
        description="게시판을 고르거나, 최근 글을 바로 열어 보세요. 신편입생 게시판은 가입 전에도 글을 남길 수 있습니다."
      />
      <section className="mx-auto max-w-6xl px-5 py-8 md:py-10">
        {errorMessage ? <p className="mb-4 text-sm text-red-500">{errorMessage}</p> : null}

        {isLoading ? <p className="text-sm text-[var(--text-muted)]">게시판을 불러오는 중입니다.</p> : null}

        {!isLoading && previews.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            아직 열린 게시판이 없습니다. 운영진이 게시판 관리에서 만들면 여기에 나타납니다.
          </p>
        ) : null}

        {previews.length > 0 ? (
          <div className="mb-5 flex flex-wrap gap-2">
            {previews.map(({ board }) => (
              <Link
                key={`chip-${board.id}`}
                href={boardPublicPath(board.id)}
                className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm hover:border-cyan-500/50 hover:text-cyan-700 dark:hover:text-cyan-glow"
              >
                {board.title}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {previews.map(({ board, posts }) => {
            const canWrite = canWriteOnBoard(role, board.writeRole, isAdmin, membership === "member" && Boolean(uid));
            const isGallery = board.skin === "gallery";
            const galleryPosts = isGallery ? posts.filter((post) => postCoverUrl(post)) : [];

            return (
              <article key={board.id} className="glass-card flex flex-col rounded-3xl p-4 md:p-5">
                <div className="mb-3 flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-cyan-700 dark:text-cyan-glow">{board.group}</p>
                    <Link href={boardPublicPath(board.id)} className="mt-0.5 block truncate text-base font-semibold hover:text-cyan-700 dark:hover:text-cyan-glow">
                      {board.title}
                    </Link>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {canWrite ? (
                      <Link
                        href={`${boardPublicPath(board.id)}/write`}
                        className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-semibold text-navy-950"
                      >
                        글쓰기
                      </Link>
                    ) : null}
                    <Link
                      href={boardPublicPath(board.id)}
                      aria-label={`${board.title} 더보기`}
                      className="grid h-8 w-8 place-items-center rounded-full border border-[var(--line)] text-cyan-700 dark:text-cyan-glow"
                    >
                      <Plus className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                {isGallery && galleryPosts.length > 0 ? (
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    {galleryPosts.slice(0, 3).map((post) => (
                      <Link key={post.id} href={`${boardPublicPath(board.id)}/${post.id}`} className="overflow-hidden rounded-xl">
                        <img src={postCoverUrl(post)} alt="" className="h-20 w-full object-cover" />
                      </Link>
                    ))}
                  </div>
                ) : null}

                {posts.length === 0 ? (
                  <p className="py-6 text-sm text-[var(--text-muted)]">아직 글이 없습니다.</p>
                ) : (
                  <ul className="grid gap-1">
                    {posts.map((post) => (
                      <li key={post.id}>
                        <Link
                          href={`${boardPublicPath(board.id)}/${post.id}`}
                          className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[var(--text-muted)]" />
                          {post.isNotice ? (
                            <span className="shrink-0 rounded bg-red-500 px-1 py-px text-[10px] font-semibold text-white">공지</span>
                          ) : null}
                          <span className="min-w-0 flex-1 truncate">{post.title}</span>
                          <span className="shrink-0 font-mono text-xs text-[var(--text-muted)]">{formatPostDateShort(post.createdAt)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
