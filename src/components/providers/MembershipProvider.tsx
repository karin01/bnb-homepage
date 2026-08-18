"use client";

import {
  loginAccount,
  logoutAccount,
  readMember,
  signupAccount,
  watchAuth,
  type SignupInput,
} from "@/lib/accounts";
import { canLoginWithStatus, type MemberStatus } from "@/lib/member-status";
import { listBoardsOrSeed } from "@/lib/boards";
import { canOpenAdmin, canUsePaidContent, type MemberRole } from "@/lib/member-roles";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type MembershipContextValue = {
  status: "loading" | "ready";
  membership: "guest" | "member";
  uid: string;
  memberName: string;
  loginId: string;
  email: string;
  role: MemberRole | null;
  memberStatus: MemberStatus | null;
  isAdmin: boolean;
  isLoggedIn: boolean;
  isStudyMember: boolean;
  emailVerified: boolean;
  signup: (input: SignupInput) => Promise<void>;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const MembershipContext = createContext<MembershipContextValue | null>(null);

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [uid, setUid] = useState("");
  const [memberName, setMemberName] = useState("학우");
  const [loginId, setLoginId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole | null>(null);
  const [memberStatus, setMemberStatus] = useState<MemberStatus | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    const unsubscribe = watchAuth(async (user) => {
      if (!user) {
        setUid("");
        setMemberName("학우");
        setLoginId("");
        setEmail("");
        setRole(null);
        setMemberStatus(null);
        setEmailVerified(false);
        setStatus("ready");
        return;
      }

      try {
        const member = await readMember(user.uid);
        if (member && !canLoginWithStatus(member.status)) {
          await logoutAccount();
          setUid("");
          setMemberName("학우");
          setLoginId("");
          setEmail("");
          setRole(null);
          setMemberStatus(member.status);
          setEmailVerified(false);
          return;
        }
        setUid(user.uid);
        setMemberName(member?.name ?? user.displayName ?? "학우");
        setLoginId(member?.loginId ?? "");
        setEmail(member?.email ?? user.email ?? "");
        setRole(member?.role ?? "site");
        setMemberStatus(member?.status ?? "active");
        setEmailVerified(user.emailVerified);
      } catch {
        setUid(user.uid);
        setMemberName(user.displayName ?? "학우");
        setLoginId("");
        setEmail(user.email ?? "");
        setRole("site");
        setMemberStatus("active");
        setEmailVerified(user.emailVerified);
      } finally {
        setStatus("ready");
      }
    });

    return unsubscribe;
  }, []);

  const isLoggedIn = Boolean(uid) && memberStatus !== "blocked" && memberStatus !== "withdrawn";
  const isAdmin = canOpenAdmin(role, email, emailVerified) && memberStatus !== "blocked" && memberStatus !== "withdrawn";
  const isStudyMember = isLoggedIn && (canUsePaidContent(role) || isAdmin);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    void listBoardsOrSeed().catch(() => undefined);
  }, [isAdmin]);

  const value = useMemo(
    () => ({
      status,
      membership: isLoggedIn ? ("member" as const) : ("guest" as const),
      uid,
      memberName,
      loginId,
      email,
      role,
      memberStatus,
      isAdmin,
      isLoggedIn,
      isStudyMember,
      emailVerified,
      signup: async (input: SignupInput) => {
        const session = await signupAccount(input);
        setUid(session.uid);
        setMemberName(session.name);
        setLoginId(session.loginId);
        setEmail(session.email);
        setRole(session.role);
        setMemberStatus("active");
        setEmailVerified(session.emailVerified);
        setStatus("ready");
      },
      login: async (nextLoginId: string, password: string) => {
        const session = await loginAccount(nextLoginId, password);
        setUid(session.uid);
        setMemberName(session.name);
        setLoginId(session.loginId);
        setEmail(session.email);
        setRole(session.role);
        setMemberStatus("active");
        setEmailVerified(session.emailVerified);
        setStatus("ready");
      },
      logout: async () => {
        await logoutAccount();
        setUid("");
        setMemberName("학우");
        setLoginId("");
        setEmail("");
        setRole(null);
        setMemberStatus(null);
        setEmailVerified(false);
      },
    }),
    [status, uid, memberName, loginId, email, role, memberStatus, emailVerified, isLoggedIn, isAdmin, isStudyMember],
  );

  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>;
}

export function useMembership() {
  const context = useContext(MembershipContext);
  if (!context) {
    throw new Error("useMembership는 MembershipProvider 안에서만 사용할 수 있습니다.");
  }
  return context;
}
