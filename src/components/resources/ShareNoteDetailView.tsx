"use client";

import { useMembership } from "@/components/providers/MembershipProvider";
import { PageHero } from "@/components/ui/PageHero";
import { ZoomableImageList } from "@/components/ui/ZoomableImageList";
import { parseArchiveRoomId, resourceBoardPath } from "@/data/resources";
import {
  SHARE_NOTE_MAX_BODY_LENGTH,
  formatFileSize,
  formatShareNoteDate,
  isShareNoteAudio,
  isShareNoteImage,
  isShareNotePdf,
  type ShareNoteItem,
} from "@/data/share-notes";
import { toKoreanFirebaseError } from "@/lib/firebase-errors";
import { getFirebaseAuth } from "@/lib/firebase";
import { getShareNoteDownloadUrl, readShareNote, removeShareNote, updateShareNoteContent } from "@/lib/share-notes";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type StudyAction = "summarize" | "quiz";

/** 제목을 눌러 들어온 쉐어노트 글. 공부하기·다운로드·정리·퀴즈를 한곳에 둡니다. */
export function ShareNoteDetailView() {
  const params = useParams<{ room: string; noteId: string }>();
  const router = useRouter();
  const { membership, uid, isAdmin } = useMembership();
  const [note, setNote] = useState<ShareNoteItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [showViewer, setShowViewer] = useState(false);
  const [studyText, setStudyText] = useState("");
  const [studyBusy, setStudyBusy] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTags, setEditTags] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const nextNote = await readShareNote(String(params.noteId ?? ""));
        if (cancelled) {
          return;
        }
        setNote(nextNote);
        if (nextNote) {
          setEditTitle(nextNote.title);
          setEditBody(nextNote.body);
          setEditTags(nextNote.tags.join(", "));
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(toKoreanFirebaseError(error, "노트를 불러오지 못했습니다."));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [params.noteId]);

  const canOpenFile = membership === "member";
  const canManage = Boolean(note && (isAdmin || (uid && note.uploaderUid === uid)));
  const listPath = note ? resourceBoardPath(note.room) : "/academics/resources";

  const ensureFileUrl = async () => {
    if (!note) {
      throw new Error("노트를 찾지 못했습니다.");
    }
    if (fileUrl) {
      return fileUrl;
    }
    const nextUrl = await getShareNoteDownloadUrl(note.storagePath);
    setFileUrl(nextUrl);
    return nextUrl;
  };

  const onStudy = async () => {
    setErrorMessage("");
    try {
      await ensureFileUrl();
      setShowViewer(true);
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "파일을 열지 못했습니다. 로그인 상태를 확인해 주세요."));
    }
  };

  const onDownload = async () => {
    setErrorMessage("");
    try {
      const url = await ensureFileUrl();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "파일을 받지 못했습니다. 로그인 상태를 확인해 주세요."));
    }
  };

  const onAiStudy = async (action: StudyAction) => {
    setErrorMessage("");
    setStudyBusy(true);
    try {
      const url = await ensureFileUrl();
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      if (!token) {
        throw new Error("로그인 후 이용해 주세요.");
      }
      const response = await fetch("/api/share-notes/study", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, fileUrl: url }),
      });
      const payload = (await response.json()) as { result?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "정리·퀴즈를 만들지 못했습니다.");
      }
      setStudyText(payload.result ?? "");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "정리·퀴즈를 만들지 못했습니다.");
    } finally {
      setStudyBusy(false);
    }
  };

  const onSaveEdit = async () => {
    if (!note) {
      return;
    }
    setErrorMessage("");
    setIsSavingEdit(true);
    try {
      await updateShareNoteContent(note, { title: editTitle, body: editBody, tags: editTags });
      const nextNote = await readShareNote(note.id);
      if (nextNote) {
        setNote(nextNote);
        setEditTitle(nextNote.title);
        setEditBody(nextNote.body);
        setEditTags(nextNote.tags.join(", "));
      }
      setIsEditing(false);
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "글을 저장하지 못했습니다."));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const onDelete = async () => {
    if (!note) {
      return;
    }
    const confirmed = window.confirm(`"${note.title}" 노트를 삭제할까요? 파일도 함께 지워집니다.`);
    if (!confirmed) {
      return;
    }
    try {
      await removeShareNote(note);
      router.push(listPath);
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "노트를 삭제하지 못했습니다."));
    }
  };

  if (isLoading) {
    return <p className="px-5 py-16 text-sm text-[var(--text-muted)]">노트를 불러오는 중입니다.</p>;
  }

  if (!note || parseArchiveRoomId(String(params.room ?? "")) !== note.room) {
    return (
      <section className="mx-auto max-w-4xl px-5 py-16">
        <p className="text-sm text-[var(--text-muted)]">없는 노트입니다.</p>
        <Link href="/academics/resources" className="mt-4 inline-block text-sm font-semibold text-cyan-700 dark:text-cyan-glow">
          자료실로 돌아가기
        </Link>
      </section>
    );
  }

  return (
    <>
      <PageHero
        compact
        eyebrow="쉐어노트"
        title={note.title}
        description={`${note.uploaderName} · ${formatShareNoteDate(note.createdAt)} · ${note.tags.join(" · ")}`}
      />
      <article className="mx-auto max-w-4xl px-5 py-10">
        <Link href={listPath} className="text-sm font-semibold text-cyan-700 dark:text-cyan-glow">
          ← 목록
        </Link>
        {errorMessage ? <p className="mt-4 text-sm text-red-500">{errorMessage}</p> : null}

        {isEditing ? (
          <div className="mt-6 grid gap-3">
            <label className="grid gap-1 text-sm">
              제목
              <input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              본문
              <textarea
                value={editBody}
                onChange={(event) => setEditBody(event.target.value)}
                rows={8}
                maxLength={SHARE_NOTE_MAX_BODY_LENGTH}
                className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                placeholder="글 내용을 적어 주세요."
              />
            </label>
            <label className="grid gap-1 text-sm">
              태그
              <input
                value={editTags}
                onChange={(event) => setEditTags(event.target.value)}
                className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={() => void onSaveEdit()}
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950 disabled:opacity-60"
              >
                {isSavingEdit ? "저장 중..." : "본문 저장"}
              </button>
              <button type="button" onClick={() => setIsEditing(false)} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-card mt-6 whitespace-pre-wrap rounded-3xl p-6 text-sm leading-7">
            {note.body.trim() ? note.body : "아직 본문이 없습니다. 작성자가 내용을 적으면 이 자리에 보입니다."}
          </div>
        )}

        {canManage && !isEditing ? (
          <button type="button" onClick={() => setIsEditing(true)} className="mt-3 text-sm font-medium text-cyan-700 dark:text-cyan-glow">
            본문 수정
          </button>
        ) : null}

        <p className="mt-6 text-sm text-[var(--text-muted)]">
          {note.fileName} · {formatFileSize(note.fileSize)}
        </p>

        {canOpenFile ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => void onStudy()} className="glass-card rounded-2xl p-4 text-left">
              <p className="font-semibold">공부하기</p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                {isShareNotePdf(note.fileName)
                  ? "이 화면에서 PDF를 펼칩니다."
                  : isShareNoteImage(note.fileName)
                    ? "사진을 원본 크기로 봅니다."
                    : isShareNoteAudio(note.fileName)
                      ? "음성을 이 화면에서 재생합니다."
                      : "파일을 이 화면에서 엽니다."}
              </p>
            </button>
            <button type="button" onClick={() => void onDownload()} className="glass-card rounded-2xl p-4 text-left">
              <p className="font-semibold">다운로드</p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">원본 파일을 새 탭에서 받습니다.</p>
            </button>
            {isShareNotePdf(note.fileName) ? (
              <>
                <button
                  type="button"
                  disabled={studyBusy}
                  onClick={() => void onAiStudy("summarize")}
                  className="glass-card rounded-2xl p-4 text-left disabled:opacity-60"
                >
                  <p className="font-semibold">노트 정리</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">PDF 내용을 한글로 핵심만 정리합니다.</p>
                </button>
                <button
                  type="button"
                  disabled={studyBusy}
                  onClick={() => void onAiStudy("quiz")}
                  className="glass-card rounded-2xl p-4 text-left disabled:opacity-60"
                >
                  <p className="font-semibold">퀴즈 만들기</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">PDF를 읽고 복습 문제 5개를 만듭니다.</p>
                </button>
              </>
            ) : null}
            {canManage ? (
              <button type="button" onClick={() => void onDelete()} className="glass-card rounded-2xl p-4 text-left">
                <p className="font-semibold">삭제</p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">이 노트와 파일을 지웁니다. 본인 또는 운영진만 할 수 있습니다.</p>
              </button>
            ) : null}
          </div>
        ) : (
          <p className="mt-6 text-sm text-[var(--text-muted)]">
            공부하기와 다운로드는 로그인한 회원만 할 수 있습니다.{" "}
            <Link href="/login" className="font-medium text-cyan-700 dark:text-cyan-glow">
              로그인하기
            </Link>
          </p>
        )}

        {studyBusy ? <p className="mt-4 text-sm text-[var(--text-muted)]">PDF를 읽고 있습니다. 조금 기다려 주세요.</p> : null}

        {showViewer && fileUrl ? (
          <div className="mt-8">
            <h2 className="font-semibold">공부 화면</h2>
            {isShareNotePdf(note.fileName) ? (
              <iframe title={`${note.title} PDF`} src={fileUrl} className="mt-3 h-[75vh] w-full rounded-2xl border border-[var(--line)] bg-white" />
            ) : null}
            {isShareNoteImage(note.fileName) ? (
              <div className="mt-3">
                <ZoomableImageList images={[fileUrl]} altPrefix={note.title} />
              </div>
            ) : null}
            {isShareNoteAudio(note.fileName) ? (
              <audio controls src={fileUrl} className="mt-3 w-full">
                이 브라우저는 오디오 재생을 지원하지 않습니다.
              </audio>
            ) : null}
            {!isShareNotePdf(note.fileName) && !isShareNoteImage(note.fileName) && !isShareNoteAudio(note.fileName) ? (
              <p className="mt-3 text-sm text-[var(--text-muted)]">이 형식은 화면에서 미리 볼 수 없습니다. 다운로드로 열어 주세요.</p>
            ) : null}
          </div>
        ) : null}

        {studyText ? (
          <section className="glass-card mt-8 whitespace-pre-wrap rounded-3xl p-5 text-sm leading-7">{studyText}</section>
        ) : null}
      </article>
    </>
  );
}
