"use client";

import { GRADE_ROOMS, RESOURCE_KINDS, RESOURCE_SEMESTERS, formatFileSize, subjectsForGrade, type ResourceItem } from "@/data/resources";
import { toDateString } from "@/data/schedule";
import { useResources } from "@/hooks/useResources";
import { toKoreanFirebaseError } from "@/lib/firebase-errors";
import { removeResource, saveResource, validateResourceInput } from "@/lib/resources";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type ResourceForm = {
  id: string;
  grade: 1 | 2 | 3 | 4;
  title: string;
  subject: string;
  year: number;
  semester: "1" | "2";
  kind: ResourceItem["kind"];
  date: string;
  fileName: string;
  storagePath: string;
  fileSize: number;
  contentType: string;
};

const EMPTY_FORM: ResourceForm = {
  id: "",
  grade: 1,
  title: "",
  subject: subjectsForGrade(1)[0] ?? "",
  year: new Date().getFullYear(),
  semester: "2",
  kind: "실습",
  date: toDateString(new Date()),
  fileName: "",
  storagePath: "",
  fileSize: 0,
  contentType: "",
};

export default function AdminResourcesPage() {
  const { resources, isLoading, reload, setResources } = useResources();
  const [form, setForm] = useState<ResourceForm>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const subjects = useMemo(() => subjectsForGrade(form.grade), [form.grade]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const resourceToSave = {
      ...form,
      id: form.id.trim() || `res-${Date.now()}`,
    };
    const validationMessage = validateResourceInput(resourceToSave, file, Boolean(form.storagePath));
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      await saveResource(resourceToSave, file);
      await reload();
      setForm({ ...EMPTY_FORM, date: toDateString(new Date()) });
      setFile(null);
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "자료를 저장하지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async (item: ResourceItem) => {
    const confirmed = window.confirm(`"${item.title}" 자료를 삭제할까요? 파일도 함께 지워집니다.`);
    if (!confirmed) {
      return;
    }
    setErrorMessage("");
    try {
      await removeResource(item);
      setResources((current) => current.filter((entry) => entry.id !== item.id));
      await reload();
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "자료를 삭제하지 못했습니다."));
    }
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">자료실 관리</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          기존 그누보드 목록은 가져오지 않습니다. 운영진이 올린 파일은 1~4학년 운영진 자료에 나갑니다. 학우 쉐어노트는{" "}
          <Link href="/admin/share-notes" className="font-semibold text-cyan-700 dark:text-cyan-glow">
            쉐어노트 관리
          </Link>
          에서 방별로 볼 수 있습니다. 파일은 20MB 이하입니다.
        </p>
      </div>
      {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}

      <form onSubmit={onSubmit} className="glass-card grid gap-3 rounded-3xl p-5 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          학년
          <select
            value={form.grade}
            onChange={(event) => {
              const nextGrade = Number(event.target.value) as 1 | 2 | 3 | 4;
              const nextSubjects = subjectsForGrade(nextGrade);
              setForm({
                ...form,
                grade: nextGrade,
                subject: nextSubjects.includes(form.subject) ? form.subject : (nextSubjects[0] ?? ""),
              });
            }}
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
          >
            {GRADE_ROOMS.map((room) => (
              <option key={room.grade} value={room.grade}>
                {room.title}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          과목
          <select
            value={form.subject}
            onChange={(event) => setForm({ ...form, subject: event.target.value })}
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
          >
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          연도
          <input
            type="number"
            value={form.year}
            onChange={(event) => setForm({ ...form, year: Number(event.target.value) })}
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          학기
          <select
            value={form.semester}
            onChange={(event) => setForm({ ...form, semester: event.target.value as "1" | "2" })}
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
          >
            {RESOURCE_SEMESTERS.map((semester) => (
              <option key={semester} value={semester}>
                {semester}학기
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          유형
          <select
            value={form.kind}
            onChange={(event) => setForm({ ...form, kind: event.target.value as ResourceItem["kind"] })}
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
          >
            {RESOURCE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          자료 날짜
          <input
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm md:col-span-2">
          제목
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            placeholder="예: 파이썬 10강 객체지향 실습"
          />
        </label>
        <label className="grid gap-1 text-sm md:col-span-2">
          파일
          <input
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
          />
          {form.fileName ? (
            <span className="text-xs text-[var(--text-muted)]">
              지금 저장된 파일: {form.fileName} ({formatFileSize(form.fileSize)}). 새 파일을 고르면 교체됩니다.
            </span>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">PDF, ZIP, 한글, 오피스, 실습 코드 등 20MB 이하</span>
          )}
        </label>
        <div className="md:col-span-2 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950 disabled:opacity-60"
          >
            {isSaving ? "올리는 중..." : "자료 저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              setForm({ ...EMPTY_FORM, date: toDateString(new Date()) });
              setFile(null);
            }}
            className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
          >
            입력칸 비우기
          </button>
        </div>
      </form>

      <article className="glass-card rounded-3xl p-5">
        <h2 className="font-semibold">올린 자료 {isLoading ? "" : `(${resources.length})`}</h2>
        {resources.length === 0 && !isLoading ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">아직 올린 자료가 없습니다. 위에서 파일을 올리면 공개 자료실에 바로 나갑니다.</p>
        ) : (
          <div className="mt-4 grid gap-2">
            {resources.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-2xl border border-[var(--line)] px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs text-cyan-700 dark:text-cyan-glow">
                    {item.grade}학년 · {item.year}-{item.semester} · {item.kind} · {item.subject}
                  </p>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {item.date} · {item.fileName} · {formatFileSize(item.fileSize)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForm(item)} className="rounded-full border border-[var(--line)] px-3 py-1 text-sm">
                    수정
                  </button>
                  <button type="button" onClick={() => void onDelete(item)} className="rounded-full border border-[var(--line)] px-3 py-1 text-sm">
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
