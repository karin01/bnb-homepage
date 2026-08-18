import { FirebaseError } from "firebase/app";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "이미 가입된 이메일입니다.",
  "auth/invalid-email": "이메일 형식을 확인해 주세요.",
  "auth/weak-password": "비밀번호가 너무 짧습니다. 8자 이상 영문+숫자로 입력해 주세요.",
  "auth/user-not-found": "아이디 또는 비밀번호가 올바르지 않습니다.",
  "auth/wrong-password": "아이디 또는 비밀번호가 올바르지 않습니다.",
  "auth/invalid-credential": "아이디 또는 비밀번호가 올바르지 않습니다.",
  "auth/too-many-requests": "시도가 너무 많습니다. 잠시 후 다시 해 주세요.",
  "auth/network-request-failed": "네트워크 연결을 확인해 주세요.",
  "permission-denied": "지금 이 작업에 대한 권한이 없습니다.",
  "firestore/permission-denied": "지금 이 작업에 대한 권한이 없습니다.",
  "storage/unauthorized": "파일 업로드가 저장 규칙에 막혔습니다. 로그인 상태를 확인해 주세요.",
  "storage/object-not-found": "파일을 찾지 못했습니다.",
  "storage/quota-exceeded": "저장 공간이 부족합니다. 운영진에게 알려 주세요.",
  "storage/retry-limit-exceeded": "파일 전송이 지연됩니다. 잠시 후 다시 시도해 주세요.",
  "storage/canceled": "파일 전송이 취소되었습니다.",
  "storage/unknown": "파일 저장소에 연결하지 못했습니다. Storage가 켜져 있는지 확인해 주세요.",
};

export function toKoreanFirebaseError(error: unknown, fallbackMessage: string) {
  const rawMessage = error instanceof Error ? error.message : "";
  const looksLikeStorageCors =
    /cors|access control|preflight|firebasestorage|ERR_FAILED|Failed to fetch/i.test(rawMessage);

  if (error instanceof FirebaseError) {
    if (looksLikeStorageCors || error.code === "storage/unknown" || error.code === "storage/retry-limit-exceeded") {
      return AUTH_ERROR_MESSAGES[error.code] ?? "파일 저장소에 연결하지 못했습니다. Firebase Storage가 켜져 있는지 확인해 주세요.";
    }
    return AUTH_ERROR_MESSAGES[error.code] ?? fallbackMessage;
  }
  if (looksLikeStorageCors) {
    return "파일 저장소에 연결하지 못했습니다. Firebase Storage가 켜져 있는지 확인해 주세요.";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallbackMessage;
}
