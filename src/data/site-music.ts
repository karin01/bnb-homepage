/** 사이트 하단 플레이어 곡 목록. 파일은 public/music 에 둡니다. */
import { SITE_TRACKS as GENERATED_SITE_TRACKS } from "@/data/site-music-tracks";

export type SiteTrack = {
  id: string;
  title: string;
  artist: string;
  src: string;
};

export const SITE_MUSIC_STORAGE_KEY = "bnb-site-music";

export const SITE_TRACKS: SiteTrack[] = GENERATED_SITE_TRACKS;

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
