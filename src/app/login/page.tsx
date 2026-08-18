"use client";

import { PageHero } from "@/components/ui/PageHero";
import { useMembership } from "@/components/providers/MembershipProvider";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useMembership();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await login(loginId, password);
      router.push("/academics/resources");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Login"
        title="홈페이지 로그인"
        description="홈페이지 가입 때 만든 아이디 또는 이메일로 들어옵니다. 스터디 입회 여부와 별개로, 사이트 계정만 있으면 로그인할 수 있습니다."
      />
      <section className="mx-auto max-w-md px-5 py-16">
        <form onSubmit={onSubmit} className="glass-card grid gap-4 rounded-3xl p-6">
          <label className="grid gap-1 text-sm">
            아이디 또는 이메일
            <input
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              autoComplete="username"
            />
          </label>
          <label className="grid gap-1 text-sm">
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              autoComplete="current-password"
            />
          </label>
          {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-cyan-500 px-4 py-3 text-sm font-semibold text-navy-950 disabled:opacity-60"
          >
            {isSubmitting ? "로그인 중..." : "로그인"}
          </button>
          <p className="text-center text-sm text-[var(--text-muted)]">
            아직 계정이 없다면{" "}
            <Link href="/signup" className="font-medium text-cyan-700 dark:text-cyan-glow">
              홈페이지 가입
            </Link>
          </p>
        </form>
      </section>
    </>
  );
}
