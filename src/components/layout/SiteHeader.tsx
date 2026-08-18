"use client";

import { useMembership } from "@/components/providers/MembershipProvider";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NAV_ITEMS, SITE } from "@/data/site";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function SiteHeader() {
  const pathname = usePathname();
  const { membership, memberName, isAdmin, logout } = useMembership();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy-900 font-mono text-xs font-bold text-cyan-glow">
            BnB
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold">Bit & Byte</span>
            <span className="block text-[11px] text-[var(--text-muted)]">KNOU CS Study</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-2 text-sm ${
                  active ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-glow" : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {membership === "member" ? (
            <>
              {isAdmin ? (
                <Link href="/admin" className="hidden rounded-full border border-[var(--line)] px-3 py-2 text-sm md:inline-flex">
                  관리
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  void logout();
                }}
                className="hidden rounded-full border border-[var(--line)] px-3 py-2 text-sm md:inline-flex"
              >
                {memberName} · 로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-full border border-[var(--line)] px-3 py-2 text-sm md:inline-flex">
                로그인
              </Link>
              <Link href="/signup" className="hidden rounded-full border border-[var(--line)] px-3 py-2 text-sm md:inline-flex">
                홈페이지 가입
              </Link>
            </>
          )}
          <Link
            href="/join/apply"
            className="hidden rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950 md:inline-flex"
          >
            입회신청
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] lg:hidden"
            onClick={() => setOpen((prev) => !prev)}
            aria-label="메뉴 열기"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-[var(--line)] px-5 py-4 lg:hidden">
          <p className="mb-3 font-mono text-xs text-[var(--text-muted)]">{SITE.slogan}</p>
          <div className="grid gap-2">
            {NAV_ITEMS.map((item) => (
              <div key={item.href}>
                <Link href={item.href} onClick={() => setOpen(false)} className="block py-2 font-medium">
                  {item.label}
                </Link>
                {"children" in item && item.children ? (
                  <div className="ml-3 grid gap-1 pb-2 text-sm text-[var(--text-muted)]">
                    {item.children.map((child) => (
                      <Link key={child.href} href={child.href} onClick={() => setOpen(false)}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {membership === "guest" ? (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="pt-2">
                  로그인
                </Link>
                <Link href="/signup" onClick={() => setOpen(false)}>
                  홈페이지 가입
                </Link>
              </>
            ) : (
              <>
                {isAdmin ? (
                  <Link href="/admin" onClick={() => setOpen(false)} className="pt-2">
                    관리 페이지
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    void logout();
                    setOpen(false);
                  }}
                  className="pt-2 text-left"
                >
                  {memberName} · 로그아웃
                </button>
              </>
            )}
            <Link href="/join/apply" onClick={() => setOpen(false)} className="font-semibold text-cyan-700 dark:text-cyan-glow">
              스터디 입회 신청
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
