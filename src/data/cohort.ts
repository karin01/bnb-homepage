import { SITE } from "@/data/site";

/** 2026년 1학년이 38기입니다. 이후 해는 이 앵커에서 한 해에 한 기수씩 올라갑니다. */
export const COHORT_ANCHOR_YEAR = 2026;
export const MIN_COHORT = 1;
export const MAX_COHORT = 80;

export function isValidCohort(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_COHORT && value <= MAX_COHORT;
}

export function parseCohort(value: unknown): number | null {
  if (typeof value === "number" && isValidCohort(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const asNumber = Number(value);
    return isValidCohort(asNumber) ? asNumber : null;
  }
  return null;
}

export function formatCohort(cohort: number | null | undefined) {
  return isValidCohort(cohort) ? `${cohort}기` : "미입력";
}

/** 해당 연도의 1학년 기수. 2026년=38기, 2027년=39기. */
export function freshmanCohortForYear(year = new Date().getFullYear()) {
  return SITE.currentCohort + (year - COHORT_ANCHOR_YEAR);
}

/** 학년으로 기수를 계산합니다. 1학년=38기, 2학년=37기, 3학년=36기, 4학년=35기(2026년 기준). 편입은 직접 고릅니다. */
export function cohortFromGrade(grade: string, year = new Date().getFullYear()) {
  if (grade === "transfer" || grade === "ob") {
    return null;
  }
  const gradeNumber = Number(grade);
  if (gradeNumber !== 1 && gradeNumber !== 2 && gradeNumber !== 3 && gradeNumber !== 4) {
    return null;
  }
  const cohort = freshmanCohortForYear(year) - (gradeNumber - 1);
  return isValidCohort(cohort) ? cohort : null;
}

export function displayCohort(grade: string, savedCohort: number | null) {
  return savedCohort ?? cohortFromGrade(grade);
}

export function cohortSelectOptions(current = freshmanCohortForYear()) {
  const oldest = Math.max(MIN_COHORT, current - 30);
  const newest = Math.min(MAX_COHORT, current + 1);
  const options: number[] = [];
  for (let cohort = newest; cohort >= oldest; cohort -= 1) {
    options.push(cohort);
  }
  return options;
}

export function cohortSelectOptionsFor(savedCohort: number | null) {
  const options = cohortSelectOptions();
  if (savedCohort && !options.includes(savedCohort)) {
    return [savedCohort, ...options].sort((left, right) => right - left);
  }
  return options;
}
