"use client";

import { BoardPostList } from "@/components/community/BoardPostList";
import { useParams } from "next/navigation";

export default function CommunityBoardPage() {
  const params = useParams<{ slug: string }>();
  return <BoardPostList boardId={params.slug} />;
}
