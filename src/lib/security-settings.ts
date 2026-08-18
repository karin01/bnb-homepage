import { Timestamp, collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import {
  BLOCKED_IPS_COLLECTION,
  DEFAULT_GUEST_ACCESS_SETTINGS,
  SECURITY_SETTINGS_COLLECTION,
  SECURITY_SETTINGS_DOC_ID,
  blockedIpDocumentId,
  isValidCountryCode,
  validateBlockedIpInput,
  validateGuestAccessSettings,
  type BlockedIpRecord,
  type GuestAccessSettings,
} from "@/data/security";

function toIsoDate(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return new Date().toISOString();
}

function toSettings(data: Record<string, unknown>): GuestAccessSettings {
  const rawCountries = Array.isArray(data.allowedCountryCodes) ? data.allowedCountryCodes : DEFAULT_GUEST_ACCESS_SETTINGS.allowedCountryCodes;
  const allowedCountryCodes = rawCountries
    .map((item) => String(item ?? "").trim().toUpperCase())
    .filter((item) => isValidCountryCode(item));

  return {
    blockOverseas: data.blockOverseas !== false,
    allowedCountryCodes: allowedCountryCodes.length > 0 ? allowedCountryCodes : [...DEFAULT_GUEST_ACCESS_SETTINGS.allowedCountryCodes],
    maxGuestPostsPerHour: Number(data.maxGuestPostsPerHour) || DEFAULT_GUEST_ACCESS_SETTINGS.maxGuestPostsPerHour,
    maxGuestCommentsPerHour: Number(data.maxGuestCommentsPerHour) || DEFAULT_GUEST_ACCESS_SETTINGS.maxGuestCommentsPerHour,
    floodCount: Number(data.floodCount) || DEFAULT_GUEST_ACCESS_SETTINGS.floodCount,
    floodWindowMinutes: Number(data.floodWindowMinutes) || DEFAULT_GUEST_ACCESS_SETTINGS.floodWindowMinutes,
  };
}

function toBlockedIp(id: string, data: Record<string, unknown>): BlockedIpRecord | null {
  const ip = String(data.ip ?? "").trim();
  const reason = String(data.reason ?? "").trim();
  const createdByName = String(data.createdByName ?? "").trim();
  if (!ip || !createdByName) {
    return null;
  }
  return {
    id,
    ip,
    reason,
    active: data.active !== false,
    createdAt: toIsoDate(data.createdAt),
    createdByName,
  };
}

export async function readGuestAccessSettings() {
  const snapshot = await getDoc(doc(getFirebaseDb(), SECURITY_SETTINGS_COLLECTION, SECURITY_SETTINGS_DOC_ID));
  if (!snapshot.exists()) {
    return DEFAULT_GUEST_ACCESS_SETTINGS;
  }
  return toSettings(snapshot.data() as Record<string, unknown>);
}

/** 운영진이 관리 화면에 들어오면 기본 설정을 한 번 만들어 둡니다. */
export async function ensureGuestAccessSettings() {
  const settingsRef = doc(getFirebaseDb(), SECURITY_SETTINGS_COLLECTION, SECURITY_SETTINGS_DOC_ID);
  const snapshot = await getDoc(settingsRef);
  if (snapshot.exists()) {
    return toSettings(snapshot.data() as Record<string, unknown>);
  }

  const defaults = DEFAULT_GUEST_ACCESS_SETTINGS;
  await setDoc(settingsRef, {
    ...defaults,
    updatedAt: Timestamp.now(),
  });
  return defaults;
}

export async function saveGuestAccessSettings(input: GuestAccessSettings) {
  const validationMessage = validateGuestAccessSettings(input);
  if (validationMessage) {
    throw new Error(validationMessage);
  }

  const allowedCountryCodes = input.allowedCountryCodes.map((item) => item.trim().toUpperCase());
  await setDoc(doc(getFirebaseDb(), SECURITY_SETTINGS_COLLECTION, SECURITY_SETTINGS_DOC_ID), {
    blockOverseas: input.blockOverseas,
    allowedCountryCodes,
    maxGuestPostsPerHour: input.maxGuestPostsPerHour,
    maxGuestCommentsPerHour: input.maxGuestCommentsPerHour,
    floodCount: input.floodCount,
    floodWindowMinutes: input.floodWindowMinutes,
    updatedAt: Timestamp.now(),
  });

  return {
    ...input,
    allowedCountryCodes,
  };
}

export async function listBlockedIps() {
  const snapshot = await getDocs(collection(getFirebaseDb(), BLOCKED_IPS_COLLECTION));
  return snapshot.docs
    .map((item) => toBlockedIp(item.id, item.data() as Record<string, unknown>))
    .filter((item): item is BlockedIpRecord => item !== null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function saveBlockedIp(input: { ip: string; reason: string; createdByName: string }) {
  const validationMessage = validateBlockedIpInput(input.ip, input.reason);
  if (validationMessage) {
    throw new Error(validationMessage);
  }
  const name = input.createdByName.trim() || "운영진";
  if (name.length > 40) {
    throw new Error("운영진 이름이 너무 깁니다.");
  }

  const ip = input.ip.trim();
  const id = blockedIpDocumentId(ip);
  await setDoc(doc(getFirebaseDb(), BLOCKED_IPS_COLLECTION, id), {
    ip,
    reason: input.reason.trim(),
    active: true,
    createdAt: Timestamp.now(),
    createdByName: name,
  });
  return id;
}

export async function removeBlockedIp(id: string) {
  if (!id.trim() || id.trim().length > 80) {
    throw new Error("차단 항목을 찾지 못했습니다.");
  }
  await deleteDoc(doc(getFirebaseDb(), BLOCKED_IPS_COLLECTION, id.trim()));
}
