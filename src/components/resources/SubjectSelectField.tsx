"use client";

import { useMembership } from "@/components/providers/MembershipProvider";
import { type ArchiveRoomId } from "@/data/resources";
import { useRegisteredSubjects } from "@/hooks/useRegisteredSubjects";
import Link from "next/link";

/** 학습일정에 등록된 과목을 자료실에서 고릅니다. 과목 목록을 따로 만들지 않습니다. */
export function SubjectSelectField({
  room,
  value,
  onChange,
}: {
  room?: ArchiveRoomId;
  value: string;
  onChange: (nextValue: string) => void;
}) {
  const { isAdmin } = useMembership();
  const { names, isLoading } = useRegisteredSubjects(room);
  const options = value && !names.includes(value) ? [value, ...names] : names;
  const manageHref = room === "club" ? "/admin/labs" : "/admin/schedule";
  const manageLabel = room === "club" ? "소모임 관리에서 등록" : "수업 시간표에서 등록";

  return (
    <label className="grid gap-1 text-sm md:col-span-2">
      과목
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
        disabled={isLoading}
      >
        <option value="">{isLoading ? "과목을 불러오는 중..." : "과목을 선택하세요"}</option>
        {options.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <span className="text-xs text-[var(--text-muted)]">
        학습일정에 등록된 과목입니다.
        {!isLoading && names.length === 0 ? " 이 방에 등록된 과목이 없습니다." : ""}
        {isAdmin ? (
          <>
            {" "}
            <Link href={manageHref} className="font-medium text-cyan-700 dark:text-cyan-glow">
              {manageLabel}
            </Link>
          </>
        ) : (
          " 목록에 없으면 운영진에게 등록을 요청해 주세요."
        )}
      </span>
    </label>
  );
}
