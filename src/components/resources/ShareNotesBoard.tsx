"use client";

import { archiveRoomLabel, parseArchiveRoomId, shareNotePath, toArchiveRoomField, type ArchiveRoomId } from "@/data/resources";
import { useMembership } from "@/components/providers/MembershipProvider";
import { PaidAccessNotice } from "@/components/membership/PaidAccessNotice";
import { SubjectSelectField } from "@/components/resources/SubjectSelectField";
import {
  SHARE_NOTE_MAX_BODY_LENGTH,
  formatFileSize,
  formatShareNoteDate,
  formatShareNoteSubject,
  isShareNoteAudio,
  isShareNoteImage,
  isShareNotePdf,
  type ShareNoteItem,
} from "@/data/share-notes";
import { toKoreanFirebaseError } from "@/lib/firebase-errors";
import { useShareNotes } from "@/hooks/useShareNotes";
import { filterShareNotes, saveShareNote, validateShareNoteInput } from "@/lib/share-notes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

const WRITE_ROOMS: ArchiveRoomId[] = [1, 2, 3, 4, "club"];

function noteKindLabel(item: ShareNoteItem) {
  if (isShareNotePdf(item.fileName)) {
    return "PDF";
  }
  if (isShareNoteImage(item.fileName)) {
    return "이미지";
  }
  if (isShareNoteAudio(item.fileName)) {
    return "음성";
  }
  return "파일";
}

/** 게시판 목록처럼 제목을 누르면 글이 열리고, 공부 기능은 그 안에서 씁니다. */
export function ShareNotesBoard({ room }: { room?: ArchiveRoomId }) {
  const router = useRouter();
  const { uid, memberName, status, isStudyMember } = useMembership();
  const { notes, isLoading, errorMessage, reload } = useShareNotes();
  const [keyword, setKeyword] = useState("");
  const [showWriter, setShowWriter] = useState(false);
  const [pickedRoom, setPickedRoom] = useState<ArchiveRoomId | "">("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const roomNotes = useMemo(
    () => (room ? notes.filter((item) => toArchiveRoomField(item.room) === toArchiveRoomField(room)) : notes),
    [notes, room],
  );
  const filtered = useMemo(() => filterShareNotes(notes, keyword, room), [keyword, notes, room]);
  const writeRoom = room ?? (pickedRoom === "" ? undefined : pickedRoom);
  const canUpload = isStudyMember;

  const resetForm = () => {
    setPickedRoom("");
    setSubject("");
    setTitle("");
    setBody("");
    setTags("");
    setFile(null);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!writeRoom) {
      setFormError("자료를 올릴 학년(또는 소모임) 방을 먼저 골라 주세요.");
      return;
    }
    if (!canUpload) {
      setFormError("로그인 후 노트를 올릴 수 있습니다.");
      return;
    }

    const payload = {
      room: writeRoom,
      subject,
      title,
      body,
      tags,
      uploaderUid: uid,
      uploaderName: memberName,
    };
    const validationMessage = validateShareNoteInput(payload, file);
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }
    if (!file) {
      return;
    }

    setIsSaving(true);
    setFormError("");
    try {
      const noteId = await saveShareNote(payload, file);
      await reload();
      resetForm();
      setShowWriter(false);
      router.push(shareNotePath(writeRoom, noteId));
    } catch (error) {
      setFormError(toKoreanFirebaseError(error, "노트를 올리지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-6">
      {isStudyMember ? errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null : null}
      {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-muted)]">제목을 누르면 공부하기·다운로드·정리·퀴즈가 있는 글로 들어갑니다.</p>
        {status === "ready" && canUpload ? (
          <button
            type="button"
            onClick={() => setShowWriter((current) => !current)}
            className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950"
          >
            {showWriter ? "쓰기 닫기" : "노트 쓰기"}
          </button>
        ) : null}
        {status === "ready" && !canUpload ? (
          <Link href={uid ? "/join/apply" : "/login"} className="text-sm font-medium text-cyan-700 dark:text-cyan-glow">
            {uid ? "정회원만 글쓰기" : "로그인 후 글쓰기"}
          </Link>
        ) : null}
      </div>

      {showWriter && canUpload ? (
        <form onSubmit={onSubmit} className="glass-card grid gap-3 rounded-3xl p-5 md:grid-cols-2">
          <p className="md:col-span-2 text-sm text-[var(--text-muted)]">
            {writeRoom ? archiveRoomLabel(writeRoom) : "자료실"} 방에 과목, 제목, 본문, 태그를 붙여 올립니다. 작성자는 로그인한 이름으로 남고, 본인 또는 운영진만 고치거나 지울 수 있습니다.
          </p>
          {!room ? (
            <label className="grid gap-1 text-sm md:col-span-2">
              올릴 방
              <select
                value={pickedRoom === "" ? "" : String(pickedRoom)}
                onChange={(event) => {
                  setPickedRoom(parseArchiveRoomId(event.target.value) ?? "");
                  setSubject("");
                }}
                className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              >
                <option value="">학년 또는 소모임을 선택하세요</option>
                {WRITE_ROOMS.map((item) => (
                  <option key={String(item)} value={item}>
                    {archiveRoomLabel(item)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <SubjectSelectField room={writeRoom} value={subject} onChange={setSubject} />
          <label className="grid gap-1 text-sm md:col-span-2">
            제목
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              placeholder="예: C언어 포인터 정리"
            />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            본문
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={6}
              maxLength={SHARE_NOTE_MAX_BODY_LENGTH}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              placeholder="이 노트에 대한 설명, 공부 포인트, 질문을 적어 주세요."
            />
            <span className="text-xs text-[var(--text-muted)]">{body.length}/{SHARE_NOTE_MAX_BODY_LENGTH}자</span>
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            태그
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              placeholder="콤마로 구분. 예: C언어, 소모임, 정보처리기사"
            />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            파일
            <input
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            />
            <span className="text-xs text-[var(--text-muted)]">PDF, MP3, 이미지, 문서, 실습 파일 · 20MB 이하</span>
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950 disabled:opacity-60"
            >
              {isSaving ? "올리는 중..." : "노트 등록"}
            </button>
          </div>
        </form>
      ) : null}

      {status === "ready" && !isStudyMember ? <PaidAccessNotice /> : null}

      {isStudyMember ? (
      <>
      <div className="flex flex-col gap-3 md:flex-row">
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="과목, 태그, 제목 검색. 예: C언어, 소모임"
          className="flex-1 rounded-full border border-[var(--line)] bg-transparent px-4 py-2 text-sm"
        />
        <p className="self-center text-sm text-[var(--text-muted)]">
          {isLoading ? "노트를 불러오는 중..." : `${filtered.length}개의 노트`}
        </p>
      </div>

      <div className="grid gap-3">
        {!isLoading && filtered.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            {roomNotes.length === 0
              ? room
                ? "아직 이 방에 올라온 노트가 없습니다. 정리본을 올려 주세요."
                : "아직 올라온 노트가 없습니다. 학년 방을 눌러 정리본을 올려 주세요."
              : "조건에 맞는 노트가 없습니다."}
          </p>
        ) : (
          filtered.map((item) => (
            <Link
              key={item.id}
              href={shareNotePath(item.room, item.id)}
              className="glass-card flex flex-col gap-2 rounded-2xl p-5 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-xs text-cyan-700 dark:text-cyan-glow">
                  {!room ? `${archiveRoomLabel(item.room)} · ` : ""}
                  {formatShareNoteSubject(item.subject)} · {noteKindLabel(item)} · {item.tags.join(" · ")}
                </p>
                <h2 className="mt-1 font-medium">{item.title}</h2>
                {item.body.trim() ? (
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">{item.body}</p>
                ) : null}
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {item.uploaderName} · {formatShareNoteDate(item.createdAt)} · {item.fileName} · {formatFileSize(item.fileSize)}
                </p>
              </div>
              <span className="text-sm font-medium text-cyan-700 dark:text-cyan-glow">글 열기</span>
            </Link>
          ))
        )}
      </div>
      </>
      ) : null}
    </div>
  );
}
