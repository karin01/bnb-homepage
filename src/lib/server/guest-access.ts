import {
  DEFAULT_GUEST_ACCESS_SETTINGS,
  isPrivateOrLocalIp,
  isValidIpAddress,
  normalizeIp,
  type GuestAccessSettings,
} from "@/data/security";
import {
  addRuntimeTempBlock,
  countAndAddHourly,
  countRecentActions,
  findActiveTempBlock,
  recordAccessEvent,
} from "@/lib/server/security-runtime-store";
import type { NextRequest } from "next/server";

const GEO_CACHE_MS = 6 * 60 * 60 * 1000;
const TEMP_BLOCK_MS = 24 * 60 * 60 * 1000;
const geoCache = new Map<string, { countryCode: string; until: number }>();

type FirestoreValue = {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  arrayValue?: { values?: FirestoreValue[] };
};

function readString(value?: FirestoreValue) {
  return String(value?.stringValue ?? "").trim();
}

function readBool(value?: FirestoreValue, fallback = false) {
  return typeof value?.booleanValue === "boolean" ? value.booleanValue : fallback;
}

function readInt(value?: FirestoreValue, fallback = 0) {
  if (typeof value?.doubleValue === "number" && Number.isFinite(value.doubleValue)) {
    return Math.round(value.doubleValue);
  }
  const parsed = Number(value?.integerValue ?? value?.stringValue);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readStringList(value?: FirestoreValue) {
  return (value?.arrayValue?.values ?? []).map((item) => readString(item)).filter(Boolean);
}

function projectId() {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
}

async function fetchFirestoreDocument(docPath: string) {
  const id = projectId();
  if (!id) {
    return null;
  }
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${id}/databases/(default)/documents/${docPath}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as { fields?: Record<string, FirestoreValue> };
}

async function fetchFirestoreCollection(collectionPath: string) {
  const id = projectId();
  if (!id) {
    return [];
  }
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${id}/databases/(default)/documents/${collectionPath}?pageSize=200`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    return [];
  }
  const payload = (await response.json()) as { documents?: { fields?: Record<string, FirestoreValue> }[] };
  return payload.documents ?? [];
}

export function readRequestIp(request: NextRequest) {
  const candidates = [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-real-ip"),
    request.headers.get("x-forwarded-for")?.split(",")[0],
  ];

  for (const candidate of candidates) {
    const ip = normalizeIp(String(candidate ?? ""));
    if (ip && isValidIpAddress(ip)) {
      return ip;
    }
  }

  return "127.0.0.1";
}

async function lookupCountryCode(ip: string, headerCountry: string) {
  if (headerCountry && /^[A-Z]{2}$/.test(headerCountry) && headerCountry !== "XX" && headerCountry !== "T1") {
    return headerCountry;
  }
  if (isPrivateOrLocalIp(ip)) {
    return "KR";
  }

  const cached = geoCache.get(ip);
  if (cached && cached.until > Date.now()) {
    return cached.countryCode;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      return "";
    }
    const payload = (await response.json()) as { success?: boolean; country_code?: string };
    const countryCode = String(payload.country_code ?? "").trim().toUpperCase();
    if (payload.success === false || !/^[A-Z]{2}$/.test(countryCode)) {
      return "";
    }
    geoCache.set(ip, { countryCode, until: Date.now() + GEO_CACHE_MS });
    return countryCode;
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

async function loadSettings(): Promise<GuestAccessSettings> {
  const document = await fetchFirestoreDocument("siteSecurity/guestAccess");
  const fields = document?.fields;
  if (!fields) {
    return DEFAULT_GUEST_ACCESS_SETTINGS;
  }

  const allowedCountryCodes = readStringList(fields.allowedCountryCodes)
    .map((item) => item.toUpperCase())
    .filter((item) => /^[A-Z]{2}$/.test(item));

  return {
    blockOverseas: readBool(fields.blockOverseas, true),
    allowedCountryCodes: allowedCountryCodes.length > 0 ? allowedCountryCodes : [...DEFAULT_GUEST_ACCESS_SETTINGS.allowedCountryCodes],
    maxGuestPostsPerHour: readInt(fields.maxGuestPostsPerHour, DEFAULT_GUEST_ACCESS_SETTINGS.maxGuestPostsPerHour),
    maxGuestCommentsPerHour: readInt(fields.maxGuestCommentsPerHour, DEFAULT_GUEST_ACCESS_SETTINGS.maxGuestCommentsPerHour),
    floodCount: readInt(fields.floodCount, DEFAULT_GUEST_ACCESS_SETTINGS.floodCount),
    floodWindowMinutes: readInt(fields.floodWindowMinutes, DEFAULT_GUEST_ACCESS_SETTINGS.floodWindowMinutes),
  };
}

async function loadBlockedIps() {
  const documents = await fetchFirestoreCollection("blockedIps");
  return documents
    .map((item) => ({
      ip: readString(item.fields?.ip),
      active: readBool(item.fields?.active, true),
    }))
    .filter((item) => item.ip && item.active);
}

export async function inspectGuestAccess(request: NextRequest, action: "post" | "comment") {
  const ip = readRequestIp(request);
  const headerCountry = (request.headers.get("cf-ipcountry") ?? "").trim().toUpperCase();
  const settings = await loadSettings();
  const countryCode = await lookupCountryCode(ip, headerCountry);
  const now = Date.now();

  const deny = async (message: string) => {
    await recordAccessEvent({
      ip,
      countryCode,
      action,
      allowed: false,
      at: now,
      message,
    });
    return { allowed: false as const, ip, countryCode, message };
  };

  const permanentBlocks = await loadBlockedIps();
  if (permanentBlocks.some((item) => item.ip === ip)) {
    return deny("이 접속은 운영진이 제한했습니다. 문의는 카카오채널로 남겨 주세요.");
  }

  const tempBlock = await findActiveTempBlock(ip);
  if (tempBlock) {
    return deny("짧은 시간에 요청이 많아 잠시 글을 받을 수 없습니다. 내일 다시 시도해 주세요.");
  }

  if (settings.blockOverseas && !isPrivateOrLocalIp(ip)) {
    if (countryCode && !settings.allowedCountryCodes.includes(countryCode)) {
      return deny("신편입생 게시판은 한국에서만 글을 남길 수 있습니다.");
    }
  }

  const hourLimit = action === "post" ? settings.maxGuestPostsPerHour : settings.maxGuestCommentsPerHour;
  const hourCount = await countAndAddHourly(ip, action);
  if (hourCount > hourLimit) {
    return deny("같은 자리에서 너무 자주 글을 남기고 있습니다. 잠시 후 다시 시도해 주세요.");
  }

  const floodWindowMs = settings.floodWindowMinutes * 60 * 1000;
  const recentCount = await countRecentActions(ip, floodWindowMs);
  if (recentCount + 1 >= settings.floodCount) {
    await addRuntimeTempBlock({
      ip,
      reason: `${settings.floodWindowMinutes}분 동안 ${settings.floodCount}회 이상 요청`,
      until: now + TEMP_BLOCK_MS,
      countryCode,
    });
    return deny("도배로 보여 이 접속을 하루 동안 막았습니다. 오해라면 운영진에게 알려 주세요.");
  }

  await recordAccessEvent({
    ip,
    countryCode,
    action,
    allowed: true,
    at: now,
    message: "허용",
  });

  return { allowed: true as const, ip, countryCode, message: "" };
}
