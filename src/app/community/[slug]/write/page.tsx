"use client";

import { PostEditor } from "@/components/community/PostEditor";
import { useParams } from "next/navigation";

export default function CommunityWritePage() {
  const params = useParams<{ slug: string }>();
  return <PostEditor boardId={params.slug} />;
}
