"use client";

import { SITE } from "@/data/site";
import { MessageCircle, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function FloatingCta() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-20 z-40 flex flex-col gap-2 md:right-6 md:bottom-24">
      <Link
        href="/join/apply"
        className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-3 text-sm font-semibold text-navy-950 shadow-lg shadow-cyan-500/30 hover:bg-cyan-400"
      >
        <UserPlus size={16} />
        입회 신청하기
      </Link>
      <a
        href={SITE.kakaoChatUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-[#FEE500] px-4 py-3 text-sm font-semibold text-navy-950 shadow-lg hover:bg-[#f7dc00]"
      >
        <MessageCircle size={16} />
        카카오 1:1 상담
      </a>
    </div>
  );
}
