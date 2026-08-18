/** 비가입자 글쓰기를 IP·국가로 막는 설정입니다. */

export const SECURITY_SETTINGS_COLLECTION = "siteSecurity";
export const SECURITY_SETTINGS_DOC_ID = "guestAccess";
export const BLOCKED_IPS_COLLECTION = "blockedIps";

export const DEFAULT_ALLOWED_COUNTRY_CODES = ["KR"] as const;

export type GuestAccessSettings = {
  blockOverseas: boolean;
  allowedCountryCodes: string[];
  maxGuestPostsPerHour: number;
  maxGuestCommentsPerHour: number;
  floodCount: number;
  floodWindowMinutes: number;
};

export type BlockedIpRecord = {
  id: string;
  ip: string;
  reason: string;
  active: boolean;
  createdAt: string;
  createdByName: string;
};

export const DEFAULT_GUEST_ACCESS_SETTINGS: GuestAccessSettings = {
  blockOverseas: true,
  allowedCountryCodes: [...DEFAULT_ALLOWED_COUNTRY_CODES],
  maxGuestPostsPerHour: 5,
  maxGuestCommentsPerHour: 20,
  floodCount: 8,
  floodWindowMinutes: 10,
};

const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export function normalizeIp(raw: string) {
  let ip = raw.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (ip.toLowerCase().startsWith("::ffff:")) {
    const mapped = ip.slice(7);
    if (IPV4_PATTERN.test(mapped)) {
      return mapped;
    }
  }
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.replace(/:\d+$/, "");
  }
  return ip;
}

export function isValidIpAddress(value: string) {
  const ip = normalizeIp(value);
  if (IPV4_PATTERN.test(ip)) {
    return true;
  }
  if (!ip.includes(":") || ip.length > 45) {
    return false;
  }
  return /^[0-9a-fA-F:]+$/.test(ip);
}

export function isPrivateOrLocalIp(value: string) {
  const ip = normalizeIp(value).toLowerCase();
  if (!ip || ip === "localhost" || ip === "::1" || ip === "127.0.0.1") {
    return true;
  }
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("169.254.")) {
    return true;
  }
  const match172 = ip.match(/^172\.(\d{1,3})\./);
  if (match172) {
    const second = Number(match172[1]);
    if (second >= 16 && second <= 31) {
      return true;
    }
  }
  return ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd");
}

export function blockedIpDocumentId(ip: string) {
  const safe = normalizeIp(ip).replace(/[^a-zA-Z0-9]/g, "-").slice(0, 70);
  return `ip-${safe || "unknown"}`;
}

export function isValidCountryCode(value: string) {
  return /^[A-Z]{2}$/.test(value.trim());
}

export function validateGuestAccessSettings(input: GuestAccessSettings) {
  const countries = input.allowedCountryCodes.map((item) => item.trim().toUpperCase()).filter(Boolean);
  if (countries.length < 1 || countries.length > 12) {
    return "허용 국가는 1~12개로 입력해 주세요.";
  }
  if (countries.some((item) => !isValidCountryCode(item))) {
    return "국가 코드는 KR처럼 영문 2자리로 입력해 주세요.";
  }
  if (!Number.isInteger(input.maxGuestPostsPerHour) || input.maxGuestPostsPerHour < 1 || input.maxGuestPostsPerHour > 60) {
    return "시간당 글 수는 1~60으로 입력해 주세요.";
  }
  if (!Number.isInteger(input.maxGuestCommentsPerHour) || input.maxGuestCommentsPerHour < 1 || input.maxGuestCommentsPerHour > 120) {
    return "시간당 댓글 수는 1~120으로 입력해 주세요.";
  }
  if (!Number.isInteger(input.floodCount) || input.floodCount < 3 || input.floodCount > 50) {
    return "도배 기준 횟수는 3~50으로 입력해 주세요.";
  }
  if (!Number.isInteger(input.floodWindowMinutes) || input.floodWindowMinutes < 1 || input.floodWindowMinutes > 180) {
    return "도배 감시 시간은 1~180분으로 입력해 주세요.";
  }
  return "";
}

export function validateBlockedIpInput(ip: string, reason: string) {
  if (!isValidIpAddress(ip)) {
    return "IP 주소 형식을 확인해 주세요. 예: 203.0.113.10";
  }
  if (isPrivateOrLocalIp(ip)) {
    return "내부망·내 컴퓨터 IP는 차단하지 않습니다. 실수로 관리 화면이 막히는 일을 막기 위해서입니다.";
  }
  if (reason.trim().length > 80) {
    return "차단 이유는 80자 이하로 입력해 주세요.";
  }
  return "";
}

export function countryLabel(code: string) {
  const labels: Record<string, string> = {
    KR: "대한민국",
    JP: "일본",
    CN: "중국",
    US: "미국",
    RU: "러시아",
    VN: "베트남",
    TH: "태국",
    TW: "대만",
    HK: "홍콩",
    SG: "싱가포르",
    DE: "독일",
    GB: "영국",
    AU: "호주",
  };
  return labels[code] ? `${labels[code]} (${code})` : code || "모름";
}
