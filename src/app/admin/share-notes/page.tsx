"use client";

import { archiveRoomLabel } from "@/data/resources";
import { formatFileSize, formatShareNoteDate, formatShareNoteSubject, type ShareNoteItem } from "@/data/share-notes";
import { useShareNotes } from "@/hooks/useShareNotes";
import { toKoreanFirebaseError } from "@/lib/firebase-errors";
import { removeShareNote } from "@/lib/share-notes";
import { useState } from "react";

export default function AdminShareNotesPage() {
  const { notes, isLoading, errorMessage, setNotes } = useShareNotes();
  const [actionMessage, setActionMessage] = useState("");

  const onDelete = async (item: ShareNoteItem) => {
    const confirmed = window.confirm(`"${item.title}" 노트를 삭제할까요? 파일도 함께 지워집니다.`);
    if (!confirmed) {
      return;
    }
    setActionMessage("");
    try {
      await removeShareNote(item);
      setNotes((current) => current.filter((entry) => entry.id !== item.id));
    } catch (error) {
      setActionMessage(toKoreanFirebaseError(error, "노트를 삭제하지 못했습니다."));
    }
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">쉐어노트 관리</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          자료실 각 방(1~4학년, 소모임·기타)에 회원이 올린 노트입니다. 삭제는 여기서도, 해당 방 화면에서도 할 수 있습니다.
        </p>
      </div>
      {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
      {actionMessage ? <p className="text-sm text-red-500">{actionMessage}</p> : null}

      <article className="glass-card rounded-3xl p-5">
        <h2 className="font-semibold">올린 노트 {isLoading ? "" : `(${notes.length})`}</h2>
        {notes.length === 0 && !isLoading ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">아직 올린 노트가 없습니다.</p>
        ) : (
          <div className="mt-4 grid gap-2">
            {notes.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-2xl border border-[var(--line)] px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs text-cyan-700 dark:text-cyan-glow">
                    {archiveRoomLabel(item.room)} · {formatShareNoteSubject(item.subject)} · {item.tags.join(" · ")}
                  </p>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {item.uploaderName} · {formatShareNoteDate(item.createdAt)} · {item.fileName} · {formatFileSize(item.fileSize)}
                  </p>
                </div>
                <button type="button" onClick={() => void onDelete(item)} className="rounded-full border border-[var(--line)] px-3 py-1 text-sm">
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
