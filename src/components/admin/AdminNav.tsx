"use client";

import { useMembership } from "@/components/providers/MembershipProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_LINKS = [
  { href: "/admin", label: "한눈에 보기" },
  { href: "/admin/members", label: "회원 관리" },
  { href: "/admin/boards", label: "게시판 관리" },
  { href: "/admin/schedule", label: "시간표·과목" },
  { href: "/admin/labs", label: "소모임 관리" },
  { href: "/admin/calendar", label: "학사 일정" },
  { href: "/admin/resources", label: "자료실" },
  { href: "/admin/share-notes", label: "쉐어노트" },
  { href: "/admin/security", label: "접속 보안" },
];

export function AdminNav() {
  const pathname = usePathname();
  const { memberName } = useMembership();

  return (
    <aside className="glass-card rounded-3xl p-5">
      <p className="font-mono text-xs tracking-[0.2em] text-cyan-700 uppercase dark:text-cyan-glow">Admin</p>
      <h2 className="mt-2 text-lg font-semibold">운영 관리</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{memberName} 운영진</p>
      <nav className="mt-5 grid gap-2">
        {ADMIN_LINKS.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-4 py-2 text-sm ${
                active ? "bg-cyan-500 text-navy-950" : "border border-[var(--line)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
