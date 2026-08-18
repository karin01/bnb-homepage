import { initializeApp, getApps, getApp, deleteApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

/** 브라우저에 노출되는 Firebase 웹 설정. 보안은 규칙이 담당합니다. */
function readFirebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    throw new Error("Firebase 환경 변수가 없습니다. .env.local을 확인해 주세요.");
  }

  return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
}

function getFirebaseApp(): FirebaseApp {
  if (typeof window === "undefined") {
    throw new Error("Firebase는 브라우저에서만 초기화합니다.");
  }

  return getApps().length > 0 ? getApp() : initializeApp(readFirebaseConfig());
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function getFirebaseStorage(): FirebaseStorage {
  const app = getFirebaseApp();
  const bucket = readFirebaseConfig().storageBucket;
  return getStorage(app, `gs://${bucket}`);
}

/** 사진 올리기 전에 로그인 토큰을 Storage 요청에 붙입니다. */
export async function ensureStorageAuth() {
  const auth = getAuth(getFirebaseApp());
  await auth.authStateReady();
  if (!auth.currentUser) {
    throw new Error("로그인 세션이 없습니다. 다시 로그인한 뒤 파일을 올려 주세요.");
  }
  await auth.currentUser.getIdToken();
}

/**
 * 운영진이 다른 회원을 만들 때 쓰는 임시 앱입니다.
 * 기본 앱으로 만들면 운영진 로그인이 새 회원으로 바뀌기 때문입니다.
 */
export async function withSecondaryAuth<T>(work: (auth: Auth) => Promise<T>) {
  const appName = `admin-create-${Date.now()}`;
  const secondaryApp = initializeApp(readFirebaseConfig(), appName);
  try {
    return await work(getAuth(secondaryApp));
  } finally {
    await deleteApp(secondaryApp);
  }
}

export const BOOTSTRAP_ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_BOOTSTRAP_ADMIN_EMAIL ?? "jungwon1023@gmail.com";
