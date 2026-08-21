/** 사이트 하단 플레이어 곡 목록. 파일은 public/music 에 둡니다. */
export type SiteTrack = {
  id: string;
  title: string;
  artist: string;
  src: string;
};

export const SITE_MUSIC_STORAGE_KEY = "bnb-site-music";

export const SITE_TRACKS: SiteTrack[] = [
  { id: "bnb-01-bianbi", title: "비앤비", artist: "BnB Study", src: "/music/bnb-01-bianbi.mp3" },
  { id: "bnb-02-bit-n-byte", title: "비트 앤 바이트", artist: "BnB Study", src: "/music/bnb-02-bit-n-byte.mp3" },
  { id: "bnb-03-bit-n-byte-1", title: "비트 앤 바이트 (1)", artist: "BnB Study", src: "/music/bnb-03-bit-n-byte-1.mp3" },
  { id: "bnb-04-bit-and-byte", title: "Bit and Byte", artist: "BnB Study", src: "/music/bnb-04-bit-and-byte.mp3" },
  { id: "bnb-05-bit-amp-byte", title: "Bit & Byte", artist: "BnB Study", src: "/music/bnb-05-bit-amp-byte.mp3" },
  { id: "bnb-06-bit-amp-byte-1", title: "Bit & Byte (1)", artist: "BnB Study", src: "/music/bnb-06-bit-amp-byte-1.mp3" },
  { id: "bnb-07-bit-amp-byte-2", title: "Bit & Byte (2)", artist: "BnB Study", src: "/music/bnb-07-bit-amp-byte-2.mp3" },
  { id: "bnb-08-bit-n-byte-5", title: "비트 앤 바이트 (5)", artist: "BnB Study", src: "/music/bnb-08-bit-n-byte-5.mp3" },
  { id: "bnb-09-bit-n-byte-7", title: "비트 앤 바이트 (7)", artist: "BnB Study", src: "/music/bnb-09-bit-n-byte-7.mp3" },
  { id: "bnb-10-bit-n-byte-8", title: "비트 앤 바이트 (8)", artist: "BnB Study", src: "/music/bnb-10-bit-n-byte-8.mp3" },
  { id: "bnb-11-bit-n-byte-9", title: "비트 앤 바이트 (9)", artist: "BnB Study", src: "/music/bnb-11-bit-n-byte-9.mp3" },
  { id: "bnb-12-bit-n-byte-10", title: "비트 앤 바이트 (10)", artist: "BnB Study", src: "/music/bnb-12-bit-n-byte-10.mp3" },
  { id: "bnb-13-bit-n-byte-11", title: "비트 앤 바이트 (11)", artist: "BnB Study", src: "/music/bnb-13-bit-n-byte-11.mp3" },
  { id: "bnb-14-bit-n-byte-12", title: "비트 앤 바이트 (12)", artist: "BnB Study", src: "/music/bnb-14-bit-n-byte-12.mp3" },
  { id: "bnb-15-bit-n-byte-13", title: "비트 앤 바이트 (13)", artist: "BnB Study", src: "/music/bnb-15-bit-n-byte-13.mp3" },
  { id: "bnb-16-bit-n-byte-14", title: "비트 앤 바이트 (14)", artist: "BnB Study", src: "/music/bnb-16-bit-n-byte-14.mp3" },
  { id: "bnb-17-bit-n-byte-15", title: "비트 앤 바이트 (15)", artist: "BnB Study", src: "/music/bnb-17-bit-n-byte-15.mp3" },
  { id: "bnb-18-bit-n-byte-16", title: "비트 앤 바이트 (16)", artist: "BnB Study", src: "/music/bnb-18-bit-n-byte-16.mp3" },
  { id: "bnb-19-bit-n-byte-rock", title: "비트 앤 바이트 (Rock)", artist: "BnB Study", src: "/music/bnb-19-bit-n-byte-rock.mp3" },
  { id: "bnb-20-bit-n-byte-yuhok", title: "비트 앤 바이트의 유혹", artist: "BnB Study", src: "/music/bnb-20-bit-n-byte-yuhok.mp3" },
];

export type SiteMusicPrefs = {
  paused: boolean;
  muted: boolean;
  volume: number;
  trackId: string;
  currentTime: number;
};

export function defaultSiteMusicPrefs(): SiteMusicPrefs {
  return {
    paused: false,
    muted: false,
    volume: 0.32,
    trackId: SITE_TRACKS[0]?.id ?? "",
    currentTime: 0,
  };
}

export function clampVolume(value: number) {
  if (!Number.isFinite(value)) {
    return defaultSiteMusicPrefs().volume;
  }
  return Math.min(1, Math.max(0, value));
}

export function readSiteMusicPrefs(): SiteMusicPrefs {
  const fallback = defaultSiteMusicPrefs();
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(SITE_MUSIC_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw) as Partial<SiteMusicPrefs>;
    const trackExists = SITE_TRACKS.some((track) => track.id === parsed.trackId);
    return {
      paused: parsed.paused === true,
      muted: parsed.muted === true,
      volume: clampVolume(Number(parsed.volume)),
      trackId: trackExists && parsed.trackId ? parsed.trackId : fallback.trackId,
      currentTime: Number.isFinite(parsed.currentTime) ? Math.max(0, Number(parsed.currentTime)) : 0,
    };
  } catch {
    return fallback;
  }
}

export function writeSiteMusicPrefs(prefs: SiteMusicPrefs) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(SITE_MUSIC_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // 저장 공간이 없어도 재생은 계속합니다.
  }
}

export function formatTrackTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
