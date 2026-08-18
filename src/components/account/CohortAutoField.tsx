"use client";

import {
  cohortAutoGuideText,
  cohortFromGrade,
  cohortSelectOptionsFor,
  formatCohort,
  needsManualCohort,
  parseCohort,
} from "@/data/cohort";
import { useEffect, useState } from "react";

type CohortAutoFieldProps = {
  grade: string;
  cohort: string;
  onChange: (cohort: string) => void;
};

/** 1~4학년은 올해·학년으로 기수를 계산해 보여 주고, 편입·OB·유급만 직접 고르게 합니다. */
export function CohortAutoField({ grade, cohort, onChange }: CohortAutoFieldProps) {
  const [isPickingManually, setIsPickingManually] = useState(needsManualCohort(grade));
  const calculatedCohort = cohortFromGrade(grade);
  const mustPickManually = needsManualCohort(grade);
  const showSelect = mustPickManually || isPickingManually || !calculatedCohort;

  useEffect(() => {
    // 학년이 바뀌면 1~4학년은 다시 자동, 편입·OB는 선택칸을 엽니다.
    setIsPickingManually(needsManualCohort(grade));
  }, [grade]);

  return (
    <label className="grid gap-1 text-sm">
      기수
      {showSelect ? (
        <select
          value={cohort}
          onChange={(event) => onChange(event.target.value)}
          className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
        >
          {cohortSelectOptionsFor(parseCohort(cohort)).map((optionCohort) => (
            <option key={optionCohort} value={optionCohort}>
              {formatCohort(optionCohort)}
            </option>
          ))}
        </select>
      ) : (
        <p className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[var(--text-muted)]">
          {formatCohort(calculatedCohort)}
        </p>
      )}
      <span className="text-xs text-[var(--text-muted)]">
        {mustPickManually ? "편입·OB는 입학 기수를 직접 골라 주세요." : cohortAutoGuideText()}
      </span>
      {!mustPickManually && calculatedCohort && !showSelect ? (
        <button
          type="button"
          className="text-left text-xs text-cyan-700 underline dark:text-cyan-glow"
          onClick={() => setIsPickingManually(true)}
        >
          유급처럼 기수가 다르면 직접 고르기
        </button>
      ) : null}
      {!mustPickManually && calculatedCohort && showSelect ? (
        <button
          type="button"
          className="text-left text-xs text-cyan-700 underline dark:text-cyan-glow"
          onClick={() => {
            setIsPickingManually(false);
            onChange(String(calculatedCohort));
          }}
        >
          학년 기준으로 다시 맞추기
        </button>
      ) : null}
    </label>
  );
}
