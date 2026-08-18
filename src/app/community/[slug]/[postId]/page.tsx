"use client";

import { PostDetailView } from "@/components/community/PostDetailView";
import { useParams } from "next/navigation";

export default function CommunityPostPage() {
  const params = useParams<{ slug: string; postId: string }>();
  return <PostDetailView boardId={params.slug} postId={params.postId} />;
}
