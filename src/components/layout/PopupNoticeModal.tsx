"use client";

import {
  closePopupNoticeThisSession,
  dismissPopupNoticeForToday,
  isPopupNoticeClosedThisSession,
  isPopupNoticeDismissedToday,
  pickActivePopupNotice,
  todayDateString,
  type PopupNotice,
} from "@/data/popup-notices";
import { listPopupNotices } from "@/lib/popup-notices";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type PopupNoticeDialogProps = {
  notice: PopupNotice;
  onClose: () => void;
  onDismissToday: () => void;
};

export function PopupNoticeDialog({ notice, onClose, onDismissToday }: PopupNoticeDialogProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/55 px-4 py-8" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-notice-title"
        className="glass-card max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="font-mono text-xs tracking-[0.2em] text-cyan-700 uppercase dark:text-cyan-glow">Notice</p>
        <h2 id="popup-notice-title" className="mt-2 break-keep text-xl font-semibold">
          {notice.title}
        </h2>
        {notice.imageUrl ? (
          <img src={notice.imageUrl} alt={notice.title} className="mt-4 w-full rounded-2xl object-contain" />
        ) : null}
        {notice.body.trim() ? (
          <p className="mt-4 whitespace-pre-wrap break-keep text-sm leading-7 text-[var(--text-muted)]">{notice.body}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={onDismissToday} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            오늘 하루 보지 않기
          </button>
          <button type="button" onClick={onClose} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export function PopupNoticeModal() {
  const pathname = usePathname();
  const [notice, setNotice] = useState<PopupNotice | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      setIsOpen(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const notices = await listPopupNotices();
        if (cancelled) {
          return;
        }
        const today = todayDateString();
        const active = pickActivePopupNotice(notices, today);
        if (!active || isPopupNoticeDismissedToday(active.id, today) || isPopupNoticeClosedThisSession(active.id)) {
          setNotice(null);
          setIsOpen(false);
          return;
        }
        setNotice(active);
        setIsOpen(true);
      } catch {
        if (!cancelled) {
          setNotice(null);
          setIsOpen(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!isOpen || !notice) {
    return null;
  }

  return (
    <PopupNoticeDialog
      notice={notice}
      onClose={() => {
        closePopupNoticeThisSession(notice.id);
        setIsOpen(false);
      }}
      onDismissToday={() => {
        dismissPopupNoticeForToday(notice.id);
        closePopupNoticeThisSession(notice.id);
        setIsOpen(false);
      }}
    />
  );
}
