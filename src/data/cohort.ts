/** 2026년 1학년이 38기입니다. 이후 해는 이 앵커에서 한 해에 한 기수씩 올라갑니다. */
export const COHORT_ANCHOR_YEAR = 2026;
export const COHORT_ANCHOR_FRESHMAN = 38;
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

/** 해당 연도의 1학년 기수. 2026년=38기, 2025년=37기, 2027년=39기. */
export function freshmanCohortForYear(year = new Date().getFullYear()) {
  return COHORT_ANCHOR_FRESHMAN + (year - COHORT_ANCHOR_YEAR);
}

/** 편입·OB는 학년만으로 기수를 알 수 없어 직접 고릅니다. */
export function needsManualCohort(grade: string) {
  return grade === "transfer" || grade === "ob";
}

/** 가입 화면에 보여줄 계산 안내. 연도가 바뀌면 숫자도 같이 바뀝니다. */
export function cohortAutoGuideText(year = new Date().getFullYear()) {
  const freshmanCohort = freshmanCohortForYear(year);
  const sophomoreCohort = freshmanCohort - 1;
  return `${year}년 기준 1학년=${freshmanCohort}기, 2학년=${sophomoreCohort}기입니다. 학년을 고르면 기수가 자동으로 맞춰집니다.`;
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

/** 로그인 이름 앞에 기수를 붙입니다. 예: 38기 손진호. 기수가 없으면 이름만 둡니다. */
export function formatMemberNameWithCohort(name: string, grade: string, cohort: number | null) {
  const cohortLabel = formatCohort(displayCohort(grade, cohort));
  if (!name.trim()) {
    return cohortLabel === "미입력" ? "학우" : `${cohortLabel} 학우`;
  }
  return cohortLabel === "미입력" ? name : `${cohortLabel} ${name}`;
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
