"use client";

import { PageHero } from "@/components/ui/PageHero";
import { useMembership } from "@/components/providers/MembershipProvider";
import { SITE } from "@/data/site";
import { cohortFromGrade, cohortSelectOptions } from "@/data/cohort";
import { MEMBER_GRADES } from "@/data/member-grades";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const EMPTY_FORM = {
  loginId: "",
  password: "",
  passwordConfirm: "",
  name: "",
  studentId: "",
  grade: "1",
  cohort: String(cohortFromGrade("1") ?? SITE.currentCohort),
  email: "",
  phone: "",
  privacyAgreed: false,
};

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useMembership();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await signup(form);
      router.push("/signup/complete");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "가입에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Website Account"
        title="홈페이지 가입"
        description="홈페이지 계정입니다. 이 가입만으로는 라운지·자료실이 열리지 않습니다. 스터디 활동까지 하려면 입회원서를 내고 회비 확인을 기다려 주세요."
      />
      <section className="mx-auto grid max-w-5xl gap-6 px-5 py-12 lg:grid-cols-[1fr_0.85fr]">
        <form onSubmit={onSubmit} className="glass-card grid gap-4 rounded-3xl p-6">
          <label className="grid gap-1 text-sm">
            아이디
            <input
              value={form.loginId}
              onChange={(event) => setForm({ ...form, loginId: event.target.value })}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              placeholder="영문/숫자 4~20자"
              autoComplete="username"
            />
          </label>
          <label className="grid gap-1 text-sm">
            비밀번호
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              placeholder="영문+숫자 8자 이상"
              autoComplete="new-password"
            />
          </label>
          <label className="grid gap-1 text-sm">
            비밀번호 확인
            <input
              type="password"
              value={form.passwordConfirm}
              onChange={(event) => setForm({ ...form, passwordConfirm: event.target.value })}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              autoComplete="new-password"
            />
          </label>
          <label className="grid gap-1 text-sm">
            이름
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              autoComplete="name"
            />
          </label>
          <label className="grid gap-1 text-sm">
            학번
            <input
              value={form.studentId}
              onChange={(event) => setForm({ ...form, studentId: event.target.value })}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              placeholder="방송대 학번"
            />
          </label>
          <label className="grid gap-1 text-sm">
            학년
            <select
              value={form.grade}
              onChange={(event) => {
                const nextGrade = event.target.value;
                const nextCohort = cohortFromGrade(nextGrade);
                setForm({
                  ...form,
                  grade: nextGrade,
                  cohort: nextCohort ? String(nextCohort) : form.cohort,
                });
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
          <label className="grid gap-1 text-sm">
            기수
            <select
              value={form.cohort}
              onChange={(event) => setForm({ ...form, cohort: event.target.value })}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            >
              {cohortSelectOptions().map((cohort) => (
                <option key={cohort} value={cohort}>
                  {cohort}기
                </option>
              ))}
            </select>
            <span className="text-xs text-[var(--text-muted)]">2026년 기준 1학년=38기, 2학년=37기입니다. 편입·OB·유급만 기수를 직접 고르면 됩니다.</span>
          </label>
          <label className="grid gap-1 text-sm">
            연락처
            <input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              placeholder="010-0000-0000"
              autoComplete="tel"
            />
          </label>
          <label className="grid gap-1 text-sm">
            이메일
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              autoComplete="email"
              placeholder="로그인과 비밀번호 안내에 사용합니다"
            />
          </label>
          <label className="flex items-start gap-2 text-sm leading-6 text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={form.privacyAgreed}
              onChange={(event) => setForm({ ...form, privacyAgreed: event.target.checked })}
              className="mt-1"
            />
            홈페이지 운영을 위한 아이디, 이름, 학번, 기수, 연락처 수집에 동의합니다. 스터디 입회 개인정보 안내는 구글폼에서 따로 확인합니다.
          </label>
          {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-cyan-500 px-4 py-3 text-sm font-semibold text-navy-950 disabled:opacity-60"
          >
            {isSubmitting ? "가입 처리 중..." : "홈페이지 가입하기"}
          </button>
          <p className="text-center text-sm text-[var(--text-muted)]">
            이미 계정이 있나요?{" "}
            <Link href="/login" className="font-medium text-cyan-700 dark:text-cyan-glow">
              로그인
            </Link>
          </p>
        </form>

        <aside className="grid gap-4">
          <article className="glass-card rounded-3xl p-6">
            <p className="text-xs font-mono tracking-[0.18em] text-cyan-700 uppercase dark:text-cyan-glow">This page</p>
            <h2 className="mt-2 text-xl font-semibold">홈페이지 가입</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
              아이디를 만들어 자료실, 공지, 라운지를 이용합니다. 회비가 나가지 않습니다.
            </p>
          </article>
          <article className="glass-card rounded-3xl p-6">
            <p className="text-xs font-mono tracking-[0.18em] text-cyan-700 uppercase dark:text-cyan-glow">Not this page</p>
            <h2 className="mt-2 text-xl font-semibold">스터디 입회</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
              혜화동 아지트 강의, 소모임, 회비 납부는 입회원서로 진행합니다.
            </p>
            <Link href="/join/apply" className="mt-4 inline-block text-sm font-semibold text-cyan-700 dark:text-cyan-glow">
              입회원서 작성하기
            </Link>
          </article>
          <p className="px-2 text-xs leading-6 text-[var(--text-muted)]">
            가입 정보는 Firebase에 저장되고, 운영진은 `/admin`에서 등업합니다. 문의는{" "}
            <a href={SITE.kakaoChatUrl} className="underline" target="_blank" rel="noreferrer">
              카카오 1:1 상담
            </a>
            으로 주세요.
          </p>
        </aside>
      </section>
    </>
  );
}
