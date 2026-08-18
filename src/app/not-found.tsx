"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SITE_BASE_PATH } from "@/lib/site-path";

/** 예전 글·노트 주소를 GitHub Pages가 처리할 수 있는 주소로 옮깁니다. */
export default function NotFound() {
  useEffect(() => {
    const base = SITE_BASE_PATH;
    let path = window.location.pathname;
    if (base && path.startsWith(base)) {
      path = path.slice(base.length) || "/";
    }
    const parts = path.split("/").filter(Boolean);

    const go = (to: string) => {
      window.location.replace(`${base}${to}`);
    };

    if (parts[0] === "community" && parts[1] && parts[2] === "write") {
      go(`/community/${parts[1]}?write=1`);
      return;
    }
    if (parts[0] === "community" && parts[1] && parts[2] && parts[3] === "edit") {
      go(`/community/${parts[1]}?post=${encodeURIComponent(parts[2])}&edit=1`);
      return;
    }
    if (parts[0] === "community" && parts[1] && parts[2]) {
      go(`/community/${parts[1]}?post=${encodeURIComponent(parts[2])}`);
      return;
    }
    if (parts[0] === "academics" && parts[1] === "resources" && parts[2] && parts[3] === "notes" && parts[4]) {
      go(`/academics/resources/${parts[2]}?note=${encodeURIComponent(parts[4])}`);
      return;
    }
    if (parts[0] === "admin" && parts[1] === "boards" && parts[2]) {
      go(`/admin/boards?board=${encodeURIComponent(parts[2])}`);
    }
  }, []);

  return (
    <section className="mx-auto max-w-4xl px-5 py-16">
      <p className="text-sm text-[var(--text-muted)]">페이지를 찾지 못했습니다.</p>
      <Link href="/" className="mt-4 inline-block text-sm font-semibold text-cyan-700 dark:text-cyan-glow">
        홈으로
      </Link>
    </section>
  );
}
