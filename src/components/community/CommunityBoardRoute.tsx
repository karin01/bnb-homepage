"use client";

import { BoardPostList } from "@/components/community/BoardPostList";
import { PostDetailView } from "@/components/community/PostDetailView";
import { PostEditor } from "@/components/community/PostEditor";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

/** 예전 그누보드식 주소를 새 게시판 아이디로 바꿉니다. */
const LEGACY_BOARD_SLUGS: Record<string, string> = {
  notices: "notice",
  lounge: "free",
  qna: "qa",
};

function CommunityBoardRouteInner() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawSlug = String(params.slug ?? "");
  const canonicalSlug = LEGACY_BOARD_SLUGS[rawSlug];

  useEffect(() => {
    if (!canonicalSlug) {
      return;
    }
    const query = searchParams.toString();
    router.replace(`/community/${canonicalSlug}${query ? `?${query}` : ""}`);
  }, [canonicalSlug, router, searchParams]);

  if (canonicalSlug) {
    return <p className="px-5 py-16 text-sm text-[var(--text-muted)]">게시판으로 이동 중입니다.</p>;
  }

  const isWrite = searchParams.get("write") === "1";
  const isEdit = searchParams.get("edit") === "1";
  const postId = (searchParams.get("post") ?? "").trim();

  if (isWrite) {
    return <PostEditor boardId={rawSlug} />;
  }
  if (isEdit && postId) {
    return <PostEditor boardId={rawSlug} postId={postId} />;
  }
  if (postId) {
    return <PostDetailView boardId={rawSlug} postId={postId} />;
  }
  return <BoardPostList boardId={rawSlug} />;
}

export function CommunityBoardRoute() {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-sm text-[var(--text-muted)]">게시판을 불러오는 중입니다.</p>}>
      <CommunityBoardRouteInner />
    </Suspense>
  );
}
