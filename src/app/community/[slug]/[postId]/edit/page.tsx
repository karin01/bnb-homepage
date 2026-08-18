"use client";

import { PostEditor } from "@/components/community/PostEditor";
import { useParams } from "next/navigation";

export default function CommunityPostEditPage() {
  const params = useParams<{ slug: string; postId: string }>();
  return <PostEditor boardId={params.slug} postId={params.postId} />;
}
