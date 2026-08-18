"use client";

import { formatLectureWhen, type LectureSlot } from "@/data/schedule";
import { CLUB_STATUSES, type ClubStatus, type RegisteredSubject } from "@/data/subjects";
import { useLectures } from "@/hooks/useLectures";
import { toKoreanFirebaseError } from "@/lib/firebase-errors";
import { hideClubSubject, listClubSubjects, saveClubSubject, validateClubInput } from "@/lib/subjects";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

const EMPTY_FORM = {
  id: "",
  name: "",
  summary: "",
  status: "모집중" as ClubStatus,
  capacity: "12명",
};

export default function AdminLabsPage() {
  const { lectures } = useLectures();
  const [clubs, setClubs] = useState<RegisteredSubject[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadClubs = async () => {
    try {
      setClubs(await listClubSubjects());
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "소모임 목록을 불러오지 못했습니다."));
    }
  };

  useEffect(() => {
    void loadClubs();
  }, []);

  const lecturesBySubject = useMemo(() => {
    const grouped = new Map<string, LectureSlot[]>();
    lectures
      .filter((lecture) => lecture.grade === "club")
      .forEach((lecture) => {
        const current = grouped.get(lecture.subject) ?? [];
        grouped.set(lecture.subject, [...current, lecture]);
      });
    return grouped;
  }, [lectures]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationMessage = validateClubInput(form);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      await saveClubSubject({
        id: form.id || undefined,
        name: form.name,
        summary: form.summary,
        status: form.status,
        capacity: form.capacity,
      });
      setForm(EMPTY_FORM);
      await loadClubs();
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "소모임을 저장하지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async (club: RegisteredSubject) => {
    const confirmed = window.confirm(`"${club.name}"을 소모임 목록에서 내릴까요? 시간표에 넣은 일정은 수업 시간표에서 따로 지우면 됩니다.`);
    if (!confirmed) {
      return;
    }
    setErrorMessage("");
    try {
      await hideClubSubject(club);
      await loadClubs();
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "소모임을 삭제하지 못했습니다."));
    }
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">소모임 관리</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          여기서 소모임 소개를 만들고, 일정은 수업 시간표에서 분류를 `소모임`으로 고르면 같은 이름으로 연결됩니다.
        </p>
      </div>
      {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}

      <form onSubmit={onSubmit} className="glass-card grid gap-3 rounded-3xl p-5">
        <label className="grid gap-1 text-sm">
          소모임 이름
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            placeholder="예: AI 활용반"
          />
        </label>
        <label className="grid gap-1 text-sm">
          소개
          <textarea
            value={form.summary}
            onChange={(event) => setForm({ ...form, summary: event.target.value })}
            className="min-h-24 rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            placeholder="이 소모임이 무엇을 하는지 한두 문장으로 적어 주세요."
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            상태
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as ClubStatus })}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            >
              {CLUB_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            정원
            <input
              value={form.capacity}
              onChange={(event) => setForm({ ...form, capacity: event.target.value })}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              placeholder="예: 12명"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950 disabled:opacity-60"
          >
            {isSaving ? "저장 중..." : "소모임 저장"}
          </button>
          <button type="button" onClick={() => setForm(EMPTY_FORM)} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            입력칸 비우기
          </button>
          <Link href="/admin/schedule" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            수업 시간표에서 일정 넣기
          </Link>
        </div>
      </form>

      <div className="grid gap-3">
        {clubs.map((club) => {
          const linkedLectures = lecturesBySubject.get(club.name) ?? [];
          return (
            <article key={`${club.id}-${club.name}`} className="rounded-2xl border border-[var(--line)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-cyan-700 dark:text-cyan-glow">
                    {club.status ?? "상태 미정"} · {club.capacity ?? "정원 미정"}
                  </p>
                  <h2 className="mt-1 font-medium">{club.name}</h2>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">{club.summary ?? "소개 글이 아직 없습니다."}</p>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    {linkedLectures.length > 0
                      ? linkedLectures.map((lecture) => `${formatLectureWhen(lecture)} · ${lecture.room}`).join(" / ")
                      : "연결된 수업 일정이 없습니다. 시간표에서 분류를 소모임으로 등록해 주세요."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForm({
                    id: club.id,
                    name: club.name,
                    summary: club.summary ?? "",
                    status: (club.status as ClubStatus) || "모집중",
                    capacity: club.capacity ?? "12명",
                  })} className="rounded-full border border-[var(--line)] px-3 py-1 text-sm">
                    수정
                  </button>
                  <button type="button" onClick={() => void onDelete(club)} className="rounded-full border border-[var(--line)] px-3 py-1 text-sm">
                    삭제
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
