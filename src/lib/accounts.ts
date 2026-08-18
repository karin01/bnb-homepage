/** 홈페이지 계정은 Firebase Auth + members 문서입니다. 스터디 입회(구글폼)와는 별개입니다. */

import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { BOOTSTRAP_ADMIN_EMAIL, getFirebaseAuth, getFirebaseDb, withSecondaryAuth } from "@/lib/firebase";
import { isValidCohort, parseCohort } from "@/data/cohort";
import { isMemberGrade } from "@/data/member-grades";
import { isMemberRole, type MemberRole } from "@/lib/member-roles";
import { canLoginWithStatus, parseMemberStatus, type MemberStatus } from "@/lib/member-status";
import { toKoreanFirebaseError } from "@/lib/firebase-errors";

export type SiteMember = {
  uid: string;
  loginId: string;
  name: string;
  studentId: string;
  grade: string;
  cohort: number | null;
  email: string;
  phone: string;
  role: MemberRole;
  status: MemberStatus;
  createdAt: string;
  lastLoginAt: string;
};

export type MemberRecordPatch = {
  name?: string;
  studentId?: string;
  grade?: string;
  cohort?: number;
  phone?: string;
  role?: MemberRole;
  status?: MemberStatus;
};

export type AccountSession = {
  uid: string;
  loginId: string;
  name: string;
  email: string;
  role: MemberRole;
  emailVerified: boolean;
};

export type SignupInput = {
  loginId: string;
  password: string;
  passwordConfirm: string;
  name: string;
  studentId: string;
  grade: string;
  cohort: string;
  email: string;
  phone: string;
  privacyAgreed: boolean;
};

const MEMBER_COLLECTION = "members";
const ALIAS_COLLECTION = "loginAliases";

function normalizeLoginId(loginId: string) {
  return loginId.trim().toLowerCase();
}

export function validateSignup(input: SignupInput) {
  const loginId = normalizeLoginId(input.loginId);
  const name = input.name.trim();
  const studentId = input.studentId.trim();
  const phone = input.phone.trim();
  const email = input.email.trim();

  if (!/^[a-zA-Z0-9]{4,20}$/.test(loginId)) {
    return "아이디는 영문/숫자 4~20자로 입력해 주세요.";
  }
  if (input.password.length < 8) {
    return "비밀번호는 8자 이상이어야 합니다.";
  }
  if (!/[A-Za-z]/.test(input.password) || !/[0-9]/.test(input.password)) {
    return "비밀번호는 영문과 숫자를 함께 넣어 주세요.";
  }
  if (input.password !== input.passwordConfirm) {
    return "비밀번호 확인이 일치하지 않습니다.";
  }
  if (!name) {
    return "이름을 입력해 주세요.";
  }
  if (!studentId) {
    return "학번을 입력해 주세요.";
  }
  if (!isMemberGrade(input.grade)) {
    return "학년을 선택해 주세요.";
  }
  if (!parseCohort(input.cohort)) {
    return "기수를 선택해 주세요.";
  }
  if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(phone)) {
    return "연락처 형식을 확인해 주세요. 예: 010-1234-5678";
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "이메일을 올바르게 입력해 주세요. 로그인과 운영진 안내에 필요합니다.";
  }
  if (!input.privacyAgreed) {
    return "개인정보 수집·이용에 동의해 주세요.";
  }
  return "";
}

function toIsoDate(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return new Date().toISOString();
}

function toMember(uid: string, data: DocumentData): SiteMember | null {
  if (!isMemberRole(String(data.role ?? ""))) {
    return null;
  }

  return {
    uid,
    loginId: String(data.loginId ?? ""),
    name: String(data.name ?? ""),
    studentId: String(data.studentId ?? ""),
    grade: String(data.grade ?? "1"),
    cohort: parseCohort(data.cohort),
    email: String(data.email ?? ""),
    phone: String(data.phone ?? ""),
    role: data.role,
    status: parseMemberStatus(data.status),
    createdAt: toIsoDate(data.createdAt),
    lastLoginAt: data.lastLoginAt ? toIsoDate(data.lastLoginAt) : "",
  };
}

export function formatMemberDate(isoDate: string) {
  if (!isoDate) return "-";
  return isoDate.slice(0, 10);
}

export async function readMember(uid: string) {
  const snapshot = await getDoc(doc(getFirebaseDb(), MEMBER_COLLECTION, uid));
  if (!snapshot.exists()) {
    return null;
  }
  return toMember(snapshot.id, snapshot.data());
}

export async function listMembers() {
  const snapshot = await getDocs(collection(getFirebaseDb(), MEMBER_COLLECTION));
  return snapshot.docs
    .map((item) => toMember(item.id, item.data()))
    .filter((item): item is SiteMember => item !== null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function updateMemberRole(uid: string, role: MemberRole) {
  await updateMemberRecord(uid, { role });
}

export async function updateMemberGrade(uid: string, grade: string) {
  await updateMemberRecord(uid, { grade });
}

export async function updateMemberCohort(uid: string, cohort: number) {
  await updateMemberRecord(uid, { cohort });
}

function countActiveAdmins(members: SiteMember[]) {
  return members.filter((member) => member.role === "admin" && member.status === "active").length;
}

function assertSafeMemberChange(current: SiteMember, patch: MemberRecordPatch, members: SiteMember[]) {
  const myUid = getFirebaseAuth().currentUser?.uid ?? "";
  const nextRole = patch.role ?? current.role;
  const nextStatus = patch.status ?? current.status;
  const remainsActiveAdmin = nextRole === "admin" && nextStatus === "active";

  if (myUid && myUid === current.uid && nextStatus !== "active") {
    throw new Error("본인 계정은 차단하거나 탈퇴 처리할 수 없습니다.");
  }
  if (myUid && myUid === current.uid && current.role === "admin" && nextRole !== "admin") {
    throw new Error("본인 운영진 권한은 다른 운영진이 내려 주세요.");
  }
  if (current.role === "admin" && current.status === "active" && !remainsActiveAdmin && countActiveAdmins(members) <= 1) {
    throw new Error("마지막 운영진 계정은 권한을 내리거나 탈퇴 처리할 수 없습니다.");
  }
}

export async function updateMemberRecord(uid: string, patch: MemberRecordPatch) {
  const members = await listMembers();
  const current = members.find((member) => member.uid === uid);
  if (!current) {
    throw new Error("회원 정보를 찾을 수 없습니다.");
  }

  if (patch.grade !== undefined && !isMemberGrade(patch.grade)) {
    throw new Error("학년 값이 올바르지 않습니다.");
  }
  if (patch.cohort !== undefined && !isValidCohort(patch.cohort)) {
    throw new Error("기수 값이 올바르지 않습니다.");
  }
  if (patch.role !== undefined && !isMemberRole(patch.role)) {
    throw new Error("권한 값이 올바르지 않습니다.");
  }
  if (patch.phone !== undefined && !/^01[016789]-?\d{3,4}-?\d{4}$/.test(patch.phone.trim())) {
    throw new Error("연락처 형식을 확인해 주세요. 예: 010-1234-5678");
  }
  if (patch.name !== undefined && !patch.name.trim()) {
    throw new Error("이름을 입력해 주세요.");
  }
  if (patch.studentId !== undefined && !patch.studentId.trim()) {
    throw new Error("학번을 입력해 주세요.");
  }

  assertSafeMemberChange(current, patch, members);

  const nextData: Record<string, string | number> = {};
  if (patch.name !== undefined) nextData.name = patch.name.trim();
  if (patch.studentId !== undefined) nextData.studentId = patch.studentId.trim();
  if (patch.grade !== undefined) nextData.grade = patch.grade;
  if (patch.cohort !== undefined) nextData.cohort = patch.cohort;
  if (patch.phone !== undefined) nextData.phone = patch.phone.trim();
  if (patch.role !== undefined) nextData.role = patch.role;
  if (patch.status !== undefined) nextData.status = patch.status;

  if (Object.keys(nextData).length === 0) {
    return { ...current };
  }

  await updateDoc(doc(getFirebaseDb(), MEMBER_COLLECTION, uid), nextData);
  return {
    ...current,
    ...patch,
    name: patch.name?.trim() ?? current.name,
    studentId: patch.studentId?.trim() ?? current.studentId,
    phone: patch.phone?.trim() ?? current.phone,
  };
}

export async function updateSelectedMembers(uids: string[], patch: MemberRecordPatch) {
  const uniqueIds = [...new Set(uids.filter(Boolean))];
  if (uniqueIds.length === 0) {
    throw new Error("선택한 회원이 없습니다.");
  }

  const updated: SiteMember[] = [];
  for (const uid of uniqueIds) {
    updated.push(await updateMemberRecord(uid, patch));
  }
  return updated;
}

async function resolveEmailForLogin(loginIdOrEmail: string) {
  const trimmed = loginIdOrEmail.trim();
  if (trimmed.includes("@")) {
    return trimmed;
  }

  const aliasId = normalizeLoginId(trimmed);
  const aliasSnapshot = await getDoc(doc(getFirebaseDb(), ALIAS_COLLECTION, aliasId));
  if (!aliasSnapshot.exists()) {
    throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  }

  const email = String(aliasSnapshot.data().email ?? "");
  if (!email) {
    throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  }
  return email;
}

export async function signupAccount(input: SignupInput) {
  const errorMessage = validateSignup(input);
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  const loginId = normalizeLoginId(input.loginId);
  const email = input.email.trim();
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  const aliasRef = doc(db, ALIAS_COLLECTION, loginId);
  const aliasSnapshot = await getDoc(aliasRef);
  if (aliasSnapshot.exists()) {
    throw new Error("이미 사용 중인 아이디입니다.");
  }

  let createdUser: User | null = null;
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, input.password);
    createdUser = credential.user;
    await updateProfile(createdUser, { displayName: input.name.trim() });

    const cohort = parseCohort(input.cohort);
    if (!cohort) {
      throw new Error("기수를 선택해 주세요.");
    }

    const batch = writeBatch(db);
    const memberRef = doc(db, MEMBER_COLLECTION, createdUser.uid);
    batch.set(memberRef, {
      uid: createdUser.uid,
      loginId,
      name: input.name.trim(),
      studentId: input.studentId.trim(),
      grade: input.grade,
      cohort,
      email,
      phone: input.phone.trim(),
      role: "site",
      status: "active",
      createdAt: serverTimestamp(),
    });
    batch.set(aliasRef, {
      uid: createdUser.uid,
      loginId,
      email,
      createdAt: serverTimestamp(),
    });
    await batch.commit();

    try {
      await sendEmailVerification(createdUser);
    } catch {
      // 인증 메일 실패해도 가입 자체는 유지합니다. 운영진은 메일함에서 다시 요청할 수 있습니다.
    }

    return {
      uid: createdUser.uid,
      loginId,
      name: input.name.trim(),
      email,
      role: "site" as const,
      emailVerified: createdUser.emailVerified,
    } satisfies AccountSession;
  } catch (error) {
    if (createdUser) {
      try {
        await deleteDoc(doc(db, MEMBER_COLLECTION, createdUser.uid));
        await deleteDoc(aliasRef);
      } catch {
        // 정리 실패는 로그인 차단보다 우선하지 않습니다.
      }
      try {
        await deleteUser(createdUser);
      } catch {
        await signOut(auth);
      }
    }
    throw new Error(toKoreanFirebaseError(error, "가입에 실패했습니다. 다시 시도해 주세요."));
  }
}

export async function createMemberByAdmin(input: SignupInput & { role: MemberRole }) {
  const errorMessage = validateSignup({ ...input, privacyAgreed: true });
  if (errorMessage) {
    throw new Error(errorMessage);
  }
  if (!isMemberRole(input.role)) {
    throw new Error("권한 값이 올바르지 않습니다.");
  }

  const loginId = normalizeLoginId(input.loginId);
  const email = input.email.trim();
  const db = getFirebaseDb();
  const aliasRef = doc(db, ALIAS_COLLECTION, loginId);
  const aliasSnapshot = await getDoc(aliasRef);
  if (aliasSnapshot.exists()) {
    throw new Error("이미 사용 중인 아이디입니다.");
  }

  const cohort = parseCohort(input.cohort);
  if (!cohort) {
    throw new Error("기수를 선택해 주세요.");
  }

  return withSecondaryAuth(async (secondaryAuth) => {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, input.password);
    const createdUser = credential.user;

    try {
      await updateProfile(createdUser, { displayName: input.name.trim() });

      const batch = writeBatch(db);
      batch.set(doc(db, MEMBER_COLLECTION, createdUser.uid), {
        uid: createdUser.uid,
        loginId,
        name: input.name.trim(),
        studentId: input.studentId.trim(),
        grade: input.grade,
        cohort,
        email,
        phone: input.phone.trim(),
        role: input.role,
        status: "active",
        createdAt: serverTimestamp(),
      });
      batch.set(aliasRef, {
        uid: createdUser.uid,
        loginId,
        email,
        createdAt: serverTimestamp(),
      });
      await batch.commit();

      try {
        await sendEmailVerification(createdUser);
      } catch {
        // 인증 메일 실패해도 가입 자체는 유지합니다.
      }

      await signOut(secondaryAuth);

      return {
        uid: createdUser.uid,
        loginId,
        name: input.name.trim(),
        studentId: input.studentId.trim(),
        grade: input.grade,
        cohort,
        email,
        phone: input.phone.trim(),
        role: input.role,
        status: "active" as const,
        createdAt: new Date().toISOString(),
        lastLoginAt: "",
      } satisfies SiteMember;
    } catch (error) {
      try {
        await deleteDoc(doc(db, MEMBER_COLLECTION, createdUser.uid));
        await deleteDoc(aliasRef);
      } catch {
        // 정리 실패는 운영진에게 다시 안내합니다.
      }
      try {
        await deleteUser(createdUser);
      } catch {
        await signOut(secondaryAuth);
      }
      throw new Error(toKoreanFirebaseError(error, "회원을 추가하지 못했습니다."));
    }
  });
}

export async function loginAccount(loginId: string, password: string) {
  try {
    const email = await resolveEmailForLogin(loginId);
    const auth = getFirebaseAuth();
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await auth.authStateReady();
    const member = await readMember(credential.user.uid);
    if (!member) {
      throw new Error("회원 프로필을 찾지 못했습니다. 운영진에게 문의해 주세요.");
    }
    if (!canLoginWithStatus(member.status)) {
      await signOut(auth);
      throw new Error(member.status === "blocked" ? "차단된 계정입니다. 운영진에게 문의해 주세요." : "탈퇴한 계정입니다.");
    }

    try {
      await updateDoc(doc(getFirebaseDb(), MEMBER_COLLECTION, member.uid), {
        lastLoginAt: Timestamp.now(),
      });
    } catch {
      // 마지막 로그인 시각은 보조 정보라 실패해도 로그인은 유지합니다.
    }

    return {
      uid: member.uid,
      loginId: member.loginId,
      name: member.name,
      email: member.email,
      role: member.role,
      emailVerified: credential.user.emailVerified,
    } satisfies AccountSession;
  } catch (error) {
    throw new Error(toKoreanFirebaseError(error, "아이디 또는 비밀번호가 올바르지 않습니다."));
  }
}

export async function logoutAccount() {
  await signOut(getFirebaseAuth());
}

export function watchAuth(onChange: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), onChange);
}

export function isBootstrapAdminEmail(email: string) {
  return email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
}
