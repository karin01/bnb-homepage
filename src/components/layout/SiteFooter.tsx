import { KakaoChannelQr } from "@/components/ui/KakaoChannelQr";
import { FOOTER_STUDY_LINKS, FOOTER_UNIVERSITY_LINKS, SITE } from "@/data/site";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)] bg-navy-950 text-slate-200">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-cyan-glow">BIT & BYTE STUDY</p>
          <p className="mt-3 text-lg font-semibold">한국방송통신대학교 컴퓨터과학과 No.1 스터디그룹</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">{SITE.slogan}</p>
        </div>
        <div>
          <p className="text-sm font-semibold">바로가기</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-300">
            {FOOTER_STUDY_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-cyan-glow">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">학교</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-300">
            {FOOTER_UNIVERSITY_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="hover:text-cyan-glow"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div className="text-sm leading-7 text-slate-300">
          <p>회비 계좌: {SITE.bank.bankName} {SITE.bank.accountNumber}</p>
          <p>예금주: {SITE.bank.holder}</p>
          <p>위치: {SITE.address}</p>
          <div className="mt-4">
            <KakaoChannelQr variant="compact" />
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-4 text-center text-xs text-slate-500">
        Copyright © {SITE.shortName} STUDY All rights reserved. · 기존 사이트 {SITE.legacySiteUrl}
      </div>
    </footer>
  );
}
