"use client";

import {
  createMemberByAdmin,
  formatMemberDate,
  listMembers,
  updateMemberRecord,
  updateSelectedMembers,
  type SiteMember,
} from "@/lib/accounts";
import { useMembership } from "@/components/providers/MembershipProvider";
import { CohortAutoField } from "@/components/account/CohortAutoField";
import { cohortFromGrade, cohortSelectOptionsFor, displayCohort, formatCohort, parseCohort } from "@/data/cohort";
import { MEMBER_GRADES } from "@/data/member-grades";
import { SITE } from "@/data/site";
import { MEMBER_ROLES, ROLE_LABELS, type MemberRole } from "@/lib/member-roles";
import { MEMBER_STATUSES, STATUS_LABELS, type MemberStatus } from "@/lib/member-status";
import { toKoreanFirebaseError } from "@/lib/firebase-errors";
import { FormEvent, useEffect, useMemo, useState } from "react";

const EMPTY_ADD_FORM = {
  loginId: "",
  password: "",
  passwordConfirm: "",
  name: "",
  studentId: "",
  grade: "1",
  cohort: String(cohortFromGrade("1") ?? SITE.currentCohort),
  email: "",
  phone: "",
  role: "site" as MemberRole,
};

type StatusFilter = "all" | MemberStatus;

export default function AdminMembersPage() {
  const { uid: myUid } = useMembership();
  const [members, setMembers] = useState<SiteMember[]>([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingUid, setEditingUid] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [editForm, setEditForm] = useState({ name: "", studentId: "", phone: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadMemberList = async () => {
    const nextMembers = await listMembers();
    setMembers(nextMembers);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const nextMembers = await listMembers();
        if (cancelled) return;
        setMembers(nextMembers);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(toKoreanFirebaseError(error, "회원 목록을 불러오지 못했습니다."));
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
  }, []);

  const statusCounts = useMemo(() => {
    return {
      all: members.length,
      active: members.filter((member) => member.status === "active").length,
      blocked: members.filter((member) => member.status === "blocked").length,
      withdrawn: members.filter((member) => member.status === "withdrawn").length,
    };
  }, [members]);

  const filteredMembers = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return members.filter((member) => {
      if (statusFilter !== "all" && member.status !== statusFilter) {
        return false;
      }
      if (!needle) return true;
      return `${member.name} ${member.loginId} ${member.studentId} ${formatCohort(displayCohort(member.grade, member.cohort))} ${member.email} ${member.phone}`
        .toLowerCase()
        .includes(needle);
    });
  }, [keyword, members, statusFilter]);

  const visibleIds = filteredMembers.map((member) => member.uid);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const replaceMember = (updated: SiteMember) => {
    setMembers((current) => current.map((item) => (item.uid === updated.uid ? updated : item)));
  };

  const changeField = async (member: SiteMember, patch: Parameters<typeof updateMemberRecord>[1]) => {
    try {
      const updated = await updateMemberRecord(member.uid, patch);
      replaceMember(updated);
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "회원 정보를 바꾸지 못했습니다."));
    }
  };

  const toggleSelect = (uid: string) => {
    setSelectedIds((current) => (current.includes(uid) ? current.filter((id) => id !== uid) : [...current, uid]));
  };

  const applySelectedStatus = async (status: MemberStatus) => {
    if (selectedIds.length === 0) {
      setErrorMessage("먼저 회원을 선택해 주세요.");
      return;
    }
    const actionLabel = STATUS_LABELS[status];
    if (!window.confirm(`선택한 ${selectedIds.length}명을 ${actionLabel} 처리할까요?`)) {
      return;
    }
    setErrorMessage("");
    try {
      await updateSelectedMembers(selectedIds, { status });
      await loadMemberList();
      setSelectedIds([]);
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "선택한 회원을 처리하지 못했습니다."));
    }
  };

  const applySelectedStudyRole = async () => {
    if (selectedIds.length === 0) {
      setErrorMessage("먼저 회원을 선택해 주세요.");
      return;
    }
    if (!window.confirm(`선택한 ${selectedIds.length}명을 정회원으로 올릴까요? 회비와 입회가 확인된 분만 올리세요.`)) {
      return;
    }
    setErrorMessage("");
    try {
      await updateSelectedMembers(selectedIds, { role: "study" });
      await loadMemberList();
      setSelectedIds([]);
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "정회원으로 올리지 못했습니다."));
    }
  };

  const onAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    try {
      const created = await createMemberByAdmin({
        ...addForm,
        privacyAgreed: true,
      });
      setMembers((current) => [created, ...current]);
      setAddForm(EMPTY_ADD_FORM);
      setShowAddForm(false);
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "회원을 추가하지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  const onSaveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    try {
      const updated = await updateMemberRecord(editingUid, editForm);
      replaceMember(updated);
      setEditingUid("");
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "회원 정보를 저장하지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">회원 관리</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            구글폼 입회와 회비가 확인되면 정회원으로 올립니다. 홈페이지 회원은 신편입생 게시판 등 공개 칸만 보고, 라운지·자료실은 정회원부터 열립니다. 차단·탈퇴는 로그인만 막고, 아이디는 다시 쓰지 못하도록 남겨 둡니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void applySelectedStudyRole()} className="rounded-full bg-cyan-500 px-3 py-2 text-sm font-semibold text-navy-950">
            선택 정회원
          </button>
          <button type="button" onClick={() => void applySelectedStatus("active")} className="rounded-full border border-[var(--line)] px-3 py-2 text-sm">
            선택 정상
          </button>
          <button type="button" onClick={() => void applySelectedStatus("blocked")} className="rounded-full border border-[var(--line)] px-3 py-2 text-sm">
            선택 차단
          </button>
          <button type="button" onClick={() => void applySelectedStatus("withdrawn")} className="rounded-full border border-[var(--line)] px-3 py-2 text-sm">
            선택 탈퇴
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm((current) => !current)}
            className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950"
          >
            회원추가
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", ...MEMBER_STATUSES] as StatusFilter[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              statusFilter === tab ? "bg-cyan-500 text-navy-950" : "border border-[var(--line)] text-[var(--text-muted)]"
            }`}
          >
            {tab === "all" ? "전체" : STATUS_LABELS[tab]} {statusCounts[tab]}
          </button>
        ))}
      </div>

      <input
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="이름, 아이디, 학번, 이메일, 연락처 검색"
        className="rounded-full border border-[var(--line)] bg-transparent px-4 py-2 text-sm"
      />

      {showAddForm ? (
        <form onSubmit={onAddMember} className="glass-card grid gap-3 rounded-3xl p-5 md:grid-cols-2">
          <p className="md:col-span-2 text-sm text-[var(--text-muted)]">
            운영진이 직접 계정을 만듭니다. 비밀번호는 본인에게 따로 알려 주세요. 운영진 로그인 세션은 유지됩니다.
          </p>
          <label className="grid gap-1 text-sm">
            아이디
            <input value={addForm.loginId} onChange={(event) => setAddForm({ ...addForm, loginId: event.target.value })} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            이메일
            <input value={addForm.email} onChange={(event) => setAddForm({ ...addForm, email: event.target.value })} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            비밀번호
            <input type="password" value={addForm.password} onChange={(event) => setAddForm({ ...addForm, password: event.target.value })} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            비밀번호 확인
            <input type="password" value={addForm.passwordConfirm} onChange={(event) => setAddForm({ ...addForm, passwordConfirm: event.target.value })} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            이름
            <input value={addForm.name} onChange={(event) => setAddForm({ ...addForm, name: event.target.value })} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            학번
            <input value={addForm.studentId} onChange={(event) => setAddForm({ ...addForm, studentId: event.target.value })} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            학년
            <select
              value={addForm.grade}
              onChange={(event) => {
                const nextGrade = event.target.value;
                const nextCohort = cohortFromGrade(nextGrade);
                setAddForm({ ...addForm, grade: nextGrade, cohort: nextCohort ? String(nextCohort) : addForm.cohort });
              }}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            >
              {MEMBER_GRADES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <CohortAutoField
            grade={addForm.grade}
            cohort={addForm.cohort}
            onChange={(cohort) => setAddForm({ ...addForm, cohort })}
          />
          <label className="grid gap-1 text-sm">
            연락처
            <input value={addForm.phone} onChange={(event) => setAddForm({ ...addForm, phone: event.target.value })} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2" placeholder="010-1234-5678" />
          </label>
          <label className="grid gap-1 text-sm">
            권한
            <select value={addForm.role} onChange={(event) => setAddForm({ ...addForm, role: event.target.value as MemberRole })} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2">
              {MEMBER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" disabled={isSaving} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950 disabled:opacity-60">
              {isSaving ? "저장 중..." : "계정 만들기"}
            </button>
            <button type="button" onClick={() => setShowAddForm(false)} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
              닫기
            </button>
          </div>
        </form>
      ) : null}

      {editingUid ? (
        <form onSubmit={onSaveEdit} className="glass-card grid gap-3 rounded-3xl p-5 md:grid-cols-3">
          <p className="md:col-span-3 text-sm text-[var(--text-muted)]">이름·학번·연락처만 고칩니다. 아이디와 이메일은 바꾸지 않습니다.</p>
          <label className="grid gap-1 text-sm">
            이름
            <input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            학번
            <input value={editForm.studentId} onChange={(event) => setEditForm({ ...editForm, studentId: event.target.value })} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            연락처
            <input value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2" />
          </label>
          <div className="md:col-span-3 flex gap-2">
            <button type="submit" disabled={isSaving} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950 disabled:opacity-60">
              수정 저장
            </button>
            <button type="button" onClick={() => setEditingUid("")} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
              취소
            </button>
          </div>
        </form>
      ) : null}

      {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
      {isLoading ? <p className="text-sm text-[var(--text-muted)]">회원 목록을 불러오는 중입니다.</p> : null}

      <div className="overflow-x-auto rounded-3xl border border-[var(--line)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-black/5 text-xs text-[var(--text-muted)] dark:bg-white/5">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={() => setSelectedIds(allVisibleSelected ? selectedIds.filter((id) => !visibleIds.includes(id)) : [...new Set([...selectedIds, ...visibleIds])])}
                  aria-label="현재 목록 전체 선택"
                />
              </th>
              <th className="px-4 py-3">이름 / 아이디</th>
              <th className="px-4 py-3">기수 / 학번</th>
              <th className="px-4 py-3">학년</th>
              <th className="px-4 py-3">권한</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">연락처</th>
              <th className="px-4 py-3">가입 / 최근접속</th>
              <th className="px-4 py-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((member) => (
              <tr key={member.uid} className="border-t border-[var(--line)]">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selectedIds.includes(member.uid)} onChange={() => toggleSelect(member.uid)} aria-label={`${member.name} 선택`} />
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{member.loginId}</p>
                  <p className="text-xs text-[var(--text-muted)]">{member.email}</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={displayCohort(member.grade, member.cohort) ?? ""}
                    onChange={(event) => {
                      const nextCohort = parseCohort(event.target.value);
                      if (nextCohort) {
                        void changeField(member, { cohort: nextCohort });
                      }
                    }}
                    className="rounded-xl border border-[var(--line)] bg-transparent px-2 py-1"
                  >
                    {displayCohort(member.grade, member.cohort) === null ? <option value="">미입력</option> : null}
                    {cohortSelectOptionsFor(displayCohort(member.grade, member.cohort)).map((cohort) => (
                      <option key={cohort} value={cohort}>
                        {formatCohort(cohort)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{member.studentId}</p>
                </td>
                <td className="px-4 py-3">
                  <select value={member.grade} onChange={(event) => void changeField(member, { grade: event.target.value })} className="rounded-xl border border-[var(--line)] bg-transparent px-2 py-1">
                    {MEMBER_GRADES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select value={member.role} onChange={(event) => void changeField(member, { role: event.target.value as MemberRole })} className="rounded-xl border border-[var(--line)] bg-transparent px-2 py-1">
                    {MEMBER_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={member.status}
                    disabled={member.uid === myUid}
                    onChange={(event) => void changeField(member, { status: event.target.value as MemberStatus })}
                    className="rounded-xl border border-[var(--line)] bg-transparent px-2 py-1"
                  >
                    {MEMBER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">{member.phone}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                  <p>{formatMemberDate(member.createdAt)}</p>
                  <p>{formatMemberDate(member.lastLoginAt)}</p>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUid(member.uid);
                      setEditForm({ name: member.name, studentId: member.studentId, phone: member.phone });
                    }}
                    className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-medium text-cyan-800 dark:text-cyan-glow"
                  >
                    수정
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && filteredMembers.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--text-muted)]">조건에 맞는 회원이 없습니다.</p>
        ) : null}
      </div>
    </div>
  );
}
