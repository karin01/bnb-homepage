import { BOOTSTRAP_ADMIN_EMAIL } from "@/lib/firebase";

type TokenUser = {
  uid: string;
  email: string;
};

function readBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return "";
  }
  return header.slice(7).trim();
}

async function lookupFirebaseUser(idToken: string): Promise<TokenUser | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey || !idToken) {
    return null;
  }

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    users?: { localId?: string; email?: string }[];
  };
  const user = payload.users?.[0];
  const uid = String(user?.localId ?? "").trim();
  const email = String(user?.email ?? "").trim();
  if (!uid) {
    return null;
  }
  return { uid, email };
}

async function readMemberRole(uid: string, idToken: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    return "";
  }

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/members/${uid}`,
    {
      headers: { Authorization: `Bearer ${idToken}` },
    },
  );
  if (!response.ok) {
    return "";
  }

  const payload = (await response.json()) as {
    fields?: { role?: { stringValue?: string } };
  };
  return String(payload.fields?.role?.stringValue ?? "").trim();
}

/** 운영진 API는 로그인 토큰을 서버에서 다시 확인합니다. */
export async function requireAdminRequest(request: Request) {
  const idToken = readBearerToken(request);
  if (!idToken) {
    return { ok: false as const, message: "로그인이 필요합니다." };
  }

  const user = await lookupFirebaseUser(idToken);
  if (!user) {
    return { ok: false as const, message: "로그인 정보를 확인하지 못했습니다." };
  }

  const bootstrapEmail = (process.env.NEXT_PUBLIC_BOOTSTRAP_ADMIN_EMAIL ?? BOOTSTRAP_ADMIN_EMAIL).toLowerCase();
  if (user.email.toLowerCase() === bootstrapEmail) {
    return { ok: true as const, user };
  }

  const role = await readMemberRole(user.uid, idToken);
  if (role !== "admin") {
    return { ok: false as const, message: "운영진만 볼 수 있습니다." };
  }

  return { ok: true as const, user };
}

/** 쉐어노트 공부 기능처럼, 로그인한 회원만 쓰는 API에 사용합니다. */
export async function requireMemberRequest(request: Request) {
  const idToken = readBearerToken(request);
  if (!idToken) {
    return { ok: false as const, message: "로그인이 필요합니다." };
  }

  const user = await lookupFirebaseUser(idToken);
  if (!user) {
    return { ok: false as const, message: "로그인 정보를 확인하지 못했습니다." };
  }

  return { ok: true as const, user };
}
