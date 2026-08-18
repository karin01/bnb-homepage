"use client";

import { useMembership } from "@/components/providers/MembershipProvider";
import { PageHero } from "@/components/ui/PageHero";
import { ZoomableImageList } from "@/components/ui/ZoomableImageList";
import { boardPublicPath, canAccessBoard, canWriteOnBoard, createGuestAuthorId, formatPostDate, listPostImageUrls, validateGuestDisplayName, type BoardComment, type BoardConfig, type BoardPost } from "@/data/boards";
import { toKoreanFirebaseError } from "@/lib/firebase-errors";
import { readBoard } from "@/lib/boards";
import { listComments, readPost, removeComment, removePost, saveComment } from "@/lib/posts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export function PostDetailView({ boardId, postId }: { boardId: string; postId: string }) {
  const router = useRouter();
  const { membership, uid, memberName, role, isAdmin } = useMembership();
  const [board, setBoard] = useState<BoardConfig | null>(null);
  const [post, setPost] = useState<BoardPost | null>(null);
  const [comments, setComments] = useState<BoardComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [guestDisplayName, setGuestDisplayName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const nextBoard = await readBoard(boardId);
        const nextPost = await readPost(postId);
        setBoard(nextBoard);
        setPost(nextPost);
        if (nextPost) {
          setComments(await listComments(postId));
        }
      } catch (error) {
        setErrorMessage(toKoreanFirebaseError(error, "글을 불러오지 못했습니다."));
      } finally {
        setIsLoading(false);
      }
    };
    void run();
  }, [boardId, postId]);

  const onDeletePost = async () => {
    if (!window.confirm("이 글을 삭제할까요?")) return;
    try {
      await removePost(postId);
      router.push(boardPublicPath(boardId));
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "글을 삭제하지 못했습니다."));
    }
  };

  const onAddComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const hasAuthAccount = Boolean(uid);
    let authorUid = uid;
    let authorName = memberName;
    if (!hasAuthAccount) {
      const guestNameError = validateGuestDisplayName(guestDisplayName);
      if (guestNameError) {
        setErrorMessage(guestNameError);
        return;
      }
      authorUid = createGuestAuthorId();
      authorName = guestDisplayName.trim();
    }
    try {
      await saveComment({
        boardId,
        postId,
        body: commentBody,
        authorUid,
        authorName,
      });
      setCommentBody("");
      setComments(await listComments(postId));
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "댓글을 저장하지 못했습니다."));
    }
  };

  const onDeleteComment = async (commentId: string) => {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    try {
      await removeComment(commentId);
      setComments((current) => current.filter((item) => item.id !== commentId));
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "댓글을 삭제하지 못했습니다."));
    }
  };

  if (isLoading) {
    return <p className="px-5 py-16 text-sm text-[var(--text-muted)]">글을 불러오는 중입니다.</p>;
  }

  if (!board || !post || post.boardId !== boardId) {
    return <p className="px-5 py-16 text-sm text-[var(--text-muted)]">없는 글입니다.</p>;
  }

  if (!canAccessBoard(role, board.readRole, isAdmin)) {
    return (
      <section className="mx-auto max-w-4xl px-5 py-16">
        <p className="text-sm text-[var(--text-muted)]">이 글은 로그인한 회원만 볼 수 있습니다.</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-cyan-700 dark:text-cyan-glow">
          로그인하기
        </Link>
      </section>
    );
  }

  const canManagePost = isAdmin || Boolean(uid && post.authorUid === uid);
  const canComment = board.commentEnabled && canWriteOnBoard(role, board.writeRole, isAdmin, membership === "member");
  const hasAuthAccount = Boolean(uid);
  const postImageUrls = listPostImageUrls(post);

  return (
    <>
      <PageHero eyebrow={board.title} title={post.title} description={`${post.authorName} · ${formatPostDate(post.createdAt)}`} />
      <article className="mx-auto max-w-3xl px-5 py-16">
        {errorMessage ? <p className="mb-4 text-sm text-red-500">{errorMessage}</p> : null}
        {postImageUrls.length > 0 ? <ZoomableImageList images={postImageUrls} altPrefix={post.title} /> : null}
        <div className="glass-card whitespace-pre-wrap rounded-3xl p-6 text-sm leading-7">{post.body}</div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={boardPublicPath(boardId)} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            목록
          </Link>
          {canManagePost ? (
            <>
              <Link href={`${boardPublicPath(boardId)}/${post.id}/edit`} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
                수정
              </Link>
              <button type="button" onClick={() => void onDeletePost()} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
                삭제
              </button>
            </>
          ) : null}
        </div>

        {board.commentEnabled ? (
          <section className="mt-10">
            <h2 className="font-semibold">댓글 {comments.length}</h2>
            <div className="mt-4 grid gap-3">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-2xl border border-[var(--line)] px-4 py-3">
                  <p className="text-xs text-[var(--text-muted)]">
                    {comment.authorName} · {formatPostDate(comment.createdAt)}
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{comment.body}</p>
                  {isAdmin || Boolean(uid && comment.authorUid === uid) ? (
                    <button type="button" onClick={() => void onDeleteComment(comment.id)} className="mt-2 text-xs text-[var(--text-muted)]">
                      삭제
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            {canComment ? (
              <form onSubmit={onAddComment} className="mt-4 grid gap-2">
                {!hasAuthAccount ? (
                  <input
                    value={guestDisplayName}
                    onChange={(event) => setGuestDisplayName(event.target.value)}
                    className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-sm"
                    placeholder="표시 이름 (1~20자)"
                    maxLength={20}
                  />
                ) : null}
                <textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} rows={3} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-sm" placeholder="댓글을 남겨 주세요." />
                <button type="submit" className="w-fit rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950">
                  댓글 등록
                </button>
              </form>
            ) : (
              <p className="mt-4 text-sm text-[var(--text-muted)]">댓글은 로그인 후 작성할 수 있습니다.</p>
            )}
          </section>
        ) : null}
      </article>
    </>
  );
}
