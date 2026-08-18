"use client";

import {
  GRADE_OPTIONS,
  LECTURE_ROOMS,
  LECTURE_TYPES,
  REPEAT_CYCLES,
  SEMESTER_END_DATE,
  SEMESTER_START_DATE,
  WEEKDAYS,
  formatLecturePeriod,
  formatLectureWhen,
  gradeLabel,
  parseGrade,
  parseRepeatCycle,
  weekdayFromDate,
  withDefaultLectureSchedule,
  type Grade,
  type LectureRoom,
  type LectureSlot,
  type RepeatCycle,
  type Weekday,
} from "@/data/schedule";
import { REGISTERED_SUBJECTS, type RegisteredSubject } from "@/data/subjects";
import { useLectures } from "@/hooks/useLectures";
import { toKoreanFirebaseError } from "@/lib/firebase-errors";
import { removeLecture, saveLecture, seedDefaultLectures, validateLectureInput } from "@/lib/lectures";
import {
  listRegisteredSubjects,
  hideOrRemoveSubject,
  saveRegisteredSubject,
  validateSubjectInput,
} from "@/lib/subjects";
import { FormEvent, useEffect, useMemo, useState } from "react";

const EMPTY_FORM: LectureSlot = {
  id: "",
  grade: 1,
  subject: "파이썬프로그래밍기초",
  instructor: "",
  weekday: "토",
  startTime: "10:00",
  endTime: "12:00",
  startDate: SEMESTER_START_DATE,
  endDate: SEMESTER_END_DATE,
  repeatCycle: "매주",
  room: "강의실",
  type: "정규",
};

export default function AdminSchedulePage() {
  const { lectures, isLoading, isUsingFallback, reload, setLectures } = useLectures();
  const [subjects, setSubjects] = useState<RegisteredSubject[]>(REGISTERED_SUBJECTS);
  const [form, setForm] = useState<LectureSlot>(EMPTY_FORM);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectGrade, setNewSubjectGrade] = useState<Grade>(1);
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadSubjects = async () => {
    try {
      setSubjects(await listRegisteredSubjects());
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "과목 목록을 불러오지 못했습니다."));
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const nextSubjects = await listRegisteredSubjects();
        if (!cancelled) {
          setSubjects(nextSubjects);
        }
      } catch {
        if (!cancelled) {
          setSubjects(REGISTERED_SUBJECTS);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const subjectsInGrade = useMemo(() => {
    const inGrade = subjects.filter((subject) => subject.grade === form.grade);
    if (form.subject && !inGrade.some((subject) => subject.name === form.subject)) {
      return [{ id: `current-${form.subject}`, grade: form.grade, name: form.subject }, ...inGrade];
    }
    return inGrade;
  }, [form.grade, form.subject, subjects]);
  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.grade === form.grade && subject.name === form.subject) ?? null,
    [form.grade, form.subject, subjects],
  );

  const changeRepeatCycle = (repeatCycle: RepeatCycle) => {
    setForm({
      ...form,
      repeatCycle,
      endDate: repeatCycle === "한번" ? form.startDate : form.endDate,
      weekday: repeatCycle === "한번" ? weekdayFromDate(form.startDate) : form.weekday,
    });
  };

  const changeStartDate = (startDate: string) => {
    setForm({
      ...form,
      startDate,
      endDate: form.repeatCycle === "한번" ? startDate : form.endDate,
      weekday: form.repeatCycle === "한번" ? weekdayFromDate(startDate) : form.weekday,
    });
  };

  const changeGrade = (grade: Grade) => {
    const nextSubjects = subjects.filter((subject) => subject.grade === grade);
    const nextSubject = nextSubjects[0]?.name ?? "";
    setIsEditingSubject(false);
    setForm({
      ...form,
      grade,
      subject: nextSubject,
      type: grade === "club" ? "소모임" : form.type === "소모임" ? "정규" : form.type,
      id: form.id,
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const lectureToSave = {
      ...form,
      id: form.id.trim() || `g${form.grade}-${Date.now()}`,
    };
    const validationMessage = validateLectureInput(lectureToSave);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      await saveLecture(lectureToSave);
      await reload();
      setForm({ ...EMPTY_FORM, grade: form.grade, subject: subjectsInGrade[0]?.name ?? "" });
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "시간표를 저장하지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  const onEdit = (lecture: LectureSlot) => {
    setForm(withDefaultLectureSchedule(lecture));
  };

  const onDelete = async (lectureId: string) => {
    setErrorMessage("");
    try {
      await removeLecture(lectureId);
      setLectures((current) => current.filter((item) => item.id !== lectureId));
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "강의를 삭제하지 못했습니다."));
    }
  };

  const onSeed = async () => {
    setErrorMessage("");
    try {
      await seedDefaultLectures();
      await reload();
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "기본 시간표를 올리지 못했습니다."));
    }
  };

  const onAddSubject = async () => {
    const validationMessage = validateSubjectInput(newSubjectName, newSubjectGrade);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }
    setErrorMessage("");
    try {
      const saved = await saveRegisteredSubject({ name: newSubjectName, grade: newSubjectGrade });
      setNewSubjectName("");
      setIsEditingSubject(false);
      const nextSubjects = await listRegisteredSubjects();
      setSubjects(nextSubjects);
      setForm({
        ...form,
        grade: newSubjectGrade,
        subject: saved.name,
        type: newSubjectGrade === "club" ? "소모임" : form.type === "소모임" ? "정규" : form.type,
      });
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "과목을 등록하지 못했습니다."));
    }
  };

  const onStartEditSubject = () => {
    if (!selectedSubject) {
      setErrorMessage("수정할 과목을 과목명에서 먼저 고르세요.");
      return;
    }
    if (selectedSubject.grade === "club") {
      setErrorMessage("소모임 이름은 소모임 관리에서 바꿔 주세요.");
      return;
    }
    setErrorMessage("");
    setEditSubjectName(selectedSubject.name);
    setIsEditingSubject(true);
  };

  const onSaveSubjectEdit = async () => {
    if (!selectedSubject) {
      setErrorMessage("수정할 과목을 찾지 못했습니다.");
      return;
    }
    const validationMessage = validateSubjectInput(editSubjectName, selectedSubject.grade);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }
    setErrorMessage("");
    try {
      const previousName = selectedSubject.name;
      await saveRegisteredSubject({
        id: selectedSubject.id,
        name: editSubjectName,
        grade: selectedSubject.grade,
        summary: selectedSubject.summary,
        status: selectedSubject.status,
        capacity: selectedSubject.capacity,
      });
      const lecturesToRename = lectures.filter(
        (lecture) => lecture.grade === selectedSubject.grade && lecture.subject === previousName,
      );
      for (const lecture of lecturesToRename) {
        await saveLecture({ ...lecture, subject: editSubjectName.trim() });
      }
      if (lecturesToRename.length > 0) {
        await reload();
      }
      setForm({ ...form, subject: editSubjectName.trim() });
      setIsEditingSubject(false);
      await loadSubjects();
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "과목을 수정하지 못했습니다."));
    }
  };

  const onRemoveSelectedSubject = async () => {
    if (!selectedSubject) {
      setErrorMessage("삭제할 과목을 과목명에서 먼저 고르세요.");
      return;
    }
    if (!window.confirm(`"${selectedSubject.name}" 과목을 목록에서 뺄까요? 이미 넣은 수업 일정은 그대로 남습니다.`)) {
      return;
    }
    setErrorMessage("");
    try {
      await hideOrRemoveSubject(selectedSubject);
      const nextSubjects = await listRegisteredSubjects();
      setSubjects(nextSubjects);
      setIsEditingSubject(false);
      const remaining = nextSubjects.filter((subject) => subject.grade === form.grade);
      setForm({ ...form, subject: remaining[0]?.name ?? "" });
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "과목을 삭제하지 못했습니다."));
    }
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">수업 시간표</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          과목을 먼저 등록한 뒤 시간표에 넣습니다. 반복 주기와 시작일~종료일을 함께 저장하면, 학기 동안 같은 강의를 날짜마다 다시 올리지 않아도 됩니다.
        </p>
      </div>
      {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}

      <article className="glass-card rounded-3xl p-5">
        <h2 className="font-semibold">과목 등록</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          학년과 과목명을 넣고 등록하면, 아래 시간표의 과목명 선택칸에 바로 나타납니다. 이미 있는 과목은 과목명 옆에서 수정하거나 삭제하세요. 소모임 소개 글은{" "}
          <a href="/admin/labs" className="underline">
            소모임 관리
          </a>
          에서 수정합니다.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-[120px_1fr_auto]">
          <select
            value={newSubjectGrade}
            onChange={(event) => {
              const nextGrade = parseGrade(event.target.value);
              if (nextGrade) {
                setNewSubjectGrade(nextGrade);
              }
            }}
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-sm"
          >
            {GRADE_OPTIONS.map((option) => (
              <option key={String(option.value)} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            value={newSubjectName}
            onChange={(event) => setNewSubjectName(event.target.value)}
            placeholder="예: 데이터베이스"
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => void onAddSubject()} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950">
            과목 등록
          </button>
        </div>
      </article>

      <form onSubmit={onSubmit} className="glass-card grid gap-6 rounded-3xl p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            학년
            <select
              value={form.grade}
              onChange={(event) => {
                const nextGrade = parseGrade(event.target.value);
                if (nextGrade) {
                  changeGrade(nextGrade);
                }
              }}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            >
              {GRADE_OPTIONS.map((option) => (
                <option key={String(option.value)} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            과목명
            {isEditingSubject ? (
              <div className="flex flex-wrap gap-2">
                <input
                  value={editSubjectName}
                  onChange={(event) => setEditSubjectName(event.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                />
                <button type="button" onClick={() => void onSaveSubjectEdit()} className="rounded-full bg-cyan-500 px-3 py-2 text-sm font-semibold text-navy-950">
                  저장
                </button>
                <button type="button" onClick={() => setIsEditingSubject(false)} className="rounded-full border border-[var(--line)] px-3 py-2 text-sm">
                  취소
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <select
                  value={form.subject}
                  onChange={(event) => setForm({ ...form, subject: event.target.value })}
                  className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                >
                  {subjectsInGrade.length === 0 ? <option value="">등록된 과목이 없습니다</option> : null}
                  {subjectsInGrade.map((subject) => (
                    <option key={`${subject.grade}-${subject.name}`} value={subject.name}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={onStartEditSubject} disabled={!selectedSubject} className="rounded-full border border-[var(--line)] px-3 py-2 text-sm disabled:opacity-50">
                  수정
                </button>
                <button type="button" onClick={() => void onRemoveSelectedSubject()} disabled={!selectedSubject} className="rounded-full border border-[var(--line)] px-3 py-2 text-sm disabled:opacity-50">
                  삭제
                </button>
              </div>
            )}
          </label>
          <label className="grid gap-1 text-sm">
            강사
            <input
              value={form.instructor}
              onChange={(event) => setForm({ ...form, instructor: event.target.value })}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              placeholder="담당 학우 이름"
            />
          </label>
          <label className="grid gap-1 text-sm">
            강의실
            <select
              value={form.room}
              onChange={(event) => setForm({ ...form, room: event.target.value as LectureRoom })}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            >
              {LECTURE_ROOMS.map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3">
          <p className="text-sm font-medium text-[var(--text-muted)]">반복과 기간</p>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm">
              종류
              <select
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value as LectureSlot["type"] })}
                className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              >
                {LECTURE_TYPES.map((lectureType) => (
                  <option key={lectureType} value={lectureType}>
                    {lectureType}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              반복 주기
              <select
                value={form.repeatCycle}
                onChange={(event) => {
                  const nextCycle = parseRepeatCycle(event.target.value);
                  if (nextCycle) {
                    changeRepeatCycle(nextCycle);
                  }
                }}
                className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              >
                {REPEAT_CYCLES.map((cycle) => (
                  <option key={cycle} value={cycle}>
                    {cycle}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              반복 요일
              <select
                value={form.weekday}
                onChange={(event) => setForm({ ...form, weekday: event.target.value as Weekday })}
                disabled={form.repeatCycle === "한번"}
                className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 disabled:opacity-60"
              >
                {WEEKDAYS.map((weekday) => (
                  <option key={weekday} value={weekday}>
                    {weekday}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              시작일
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => changeStartDate(event.target.value)}
                className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              종료일
              <input
                type="date"
                value={form.endDate}
                onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                disabled={form.repeatCycle === "한번"}
                className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 disabled:opacity-60"
              />
            </label>
            <label className="grid gap-1 text-sm">
              시작 시각
              <input
                value={form.startTime}
                onChange={(event) => setForm({ ...form, startTime: event.target.value })}
                className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                placeholder="10:00"
              />
            </label>
            <label className="grid gap-1 text-sm">
              종료 시각
              <input
                value={form.endTime}
                onChange={(event) => setForm({ ...form, endTime: event.target.value })}
                className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                placeholder="12:00"
              />
            </label>
          </div>
        </div>

        <label className="grid gap-1 text-sm">
          강의 ID (비우면 자동 생성)
          <input
            value={form.id}
            onChange={(event) => setForm({ ...form, id: event.target.value })}
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            placeholder="g1-python"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950 disabled:opacity-60"
          >
            {isSaving ? "저장 중..." : "수업 저장"}
          </button>
          <button
            type="button"
            onClick={() => setForm(EMPTY_FORM)}
            className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
          >
            입력칸 비우기
          </button>
        </div>
      </form>
      <article className="glass-card rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">등록된 강의 {isLoading ? "" : `(${lectures.length})`}</h2>
          {isUsingFallback ? (
            <button type="button" onClick={() => void onSeed()} className="text-sm font-semibold text-cyan-700 dark:text-cyan-glow">
              기본 시간표 Firestore에 올리기
            </button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-2">
          {lectures.map((lecture) => (
            <div key={lecture.id} className="flex flex-col gap-2 rounded-2xl border border-[var(--line)] px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs text-cyan-700 dark:text-cyan-glow">
                  {gradeLabel(lecture.grade)} · {lecture.type} · {lecture.room}
                </p>
                <p className="font-medium">{lecture.subject}</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {formatLectureWhen(lecture)} · {formatLecturePeriod(lecture)} · 강사 {lecture.instructor}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => onEdit(lecture)} className="rounded-full border border-[var(--line)] px-3 py-1 text-sm">
                  수정
                </button>
                <button type="button" onClick={() => void onDelete(lecture.id)} className="rounded-full border border-[var(--line)] px-3 py-1 text-sm">
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
