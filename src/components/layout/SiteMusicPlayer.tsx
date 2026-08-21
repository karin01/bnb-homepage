"use client";

import {
  clampVolume,
  defaultSiteMusicPrefs,
  formatTrackTime,
  readSiteMusicPrefs,
  SITE_TRACKS,
  writeSiteMusicPrefs,
  type SiteMusicPrefs,
} from "@/data/site-music";
import { withBasePath } from "@/lib/site-path";
import { Music, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export function SiteMusicPlayer() {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");
  const audioRef = useRef<HTMLAudioElement>(null);
  const prefsRef = useRef<SiteMusicPrefs>(defaultSiteMusicPrefs());
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(defaultSiteMusicPrefs().volume);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [prefsReady, setPrefsReady] = useState(false);

  const lastSavedTimeRef = useRef(0);
  const shouldRestoreTimeRef = useRef(true);

  const track = SITE_TRACKS[trackIndex] ?? SITE_TRACKS[0];
  const persist = useCallback((patch: Partial<SiteMusicPrefs>) => {
    prefsRef.current = { ...prefsRef.current, ...patch };
    writeSiteMusicPrefs(prefsRef.current);
  }, []);

  const tryPlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || isAdminPage) {
      return;
    }
    try {
      await audio.play();
      setNeedsGesture(false);
      setUserPaused(false);
      persist({ paused: false });
    } catch {
      setNeedsGesture(true);
    }
  }, [isAdminPage, persist]);

  useEffect(() => {
    const stored = readSiteMusicPrefs();
    prefsRef.current = stored;
    const nextIndex = Math.max(
      0,
      SITE_TRACKS.findIndex((item) => item.id === stored.trackId),
    );
    setTrackIndex(nextIndex);
    setUserPaused(stored.paused);
    setMuted(stored.muted);
    setVolume(stored.volume);
    setCurrentTime(stored.currentTime);
    setPrefsReady(true);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !prefsReady) {
      return;
    }
    audio.volume = volume;
    audio.muted = muted;
    if (shouldRestoreTimeRef.current && prefsRef.current.currentTime > 0) {
      try {
        audio.currentTime = prefsRef.current.currentTime;
        shouldRestoreTimeRef.current = false;
      } catch {
        // 아직 길이를 모르면 나중에 timeupdate에서 이어갑니다.
      }
    }
  }, [muted, prefsReady, trackIndex, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !prefsReady) {
      return;
    }
    if (isAdminPage || userPaused) {
      audio.pause();
      return;
    }
    void tryPlay();
  }, [isAdminPage, prefsReady, track?.src, tryPlay, userPaused]);

  useEffect(() => {
    if (!needsGesture || userPaused || isAdminPage) {
      return;
    }
    const unlock = () => {
      void tryPlay();
    };
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, [isAdminPage, needsGesture, tryPlay, userPaused]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => {
      setCurrentTime(audio.currentTime);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
      if (Math.abs(audio.currentTime - lastSavedTimeRef.current) >= 2) {
        lastSavedTimeRef.current = audio.currentTime;
        persist({ currentTime: audio.currentTime, trackId: track.id });
      }
    };
    const onMeta = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      if (SITE_TRACKS.length <= 1) {
        return;
      }
      shouldRestoreTimeRef.current = false;
      lastSavedTimeRef.current = 0;
      setCurrentTime(0);
      setDuration(0);
      setTrackIndex((current) => {
        const nextIndex = (current + 1) % SITE_TRACKS.length;
        const nextTrack = SITE_TRACKS[nextIndex];
        if (nextTrack) {
          persist({ trackId: nextTrack.id, currentTime: 0 });
        }
        return nextIndex;
      });
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
    };
  }, [persist, track?.src]);

  if (!track) {
    return null;
  }

  const goToTrack = (index: number) => {
    if (SITE_TRACKS.length === 0) {
      return;
    }
    const nextIndex = ((index % SITE_TRACKS.length) + SITE_TRACKS.length) % SITE_TRACKS.length;
    const nextTrack = SITE_TRACKS[nextIndex];
    if (!nextTrack) {
      return;
    }
    shouldRestoreTimeRef.current = false;
    lastSavedTimeRef.current = 0;
    setCurrentTime(0);
    setDuration(0);
    setTrackIndex(nextIndex);
    persist({ trackId: nextTrack.id, currentTime: 0 });
  };

  const onTogglePlay = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (isPlaying) {
      audio.pause();
      setUserPaused(true);
      persist({ paused: true, currentTime: audio.currentTime });
      return;
    }
    void tryPlay();
  };

  const onToggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    persist({ muted: nextMuted });
  };

  const onVolume = (nextVolume: number) => {
    const safeVolume = clampVolume(nextVolume);
    setVolume(safeVolume);
    setMuted(safeVolume === 0);
    persist({ volume: safeVolume, muted: safeVolume === 0 });
  };

  const onSeek = (nextTime: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(nextTime)) {
      return;
    }
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
    persist({ currentTime: nextTime });
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={withBasePath(track.src)}
        preload="auto"
        playsInline
        loop={SITE_TRACKS.length === 1}
      />
      {isAdminPage ? null : (
        <>
          <div className="h-16" aria-hidden />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[color-mix(in_oklab,var(--bg)_92%,transparent)] backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-900 text-cyan-glow">
                  <Music size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{track.title}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {needsGesture && !isPlaying
                      ? "화면을 한 번 누르면 노래가 이어집니다."
                      : `${track.artist} · ${trackIndex + 1}/${SITE_TRACKS.length} · 전체 반복`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToTrack(trackIndex - 1)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-[var(--line)]"
                  aria-label="이전 곡"
                >
                  <SkipBack size={16} />
                </button>
                <button
                  type="button"
                  onClick={onTogglePlay}
                  className="grid h-10 w-10 place-items-center rounded-full bg-cyan-500 text-navy-950"
                  aria-label={isPlaying ? "일시정지" : "재생"}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => goToTrack(trackIndex + 1)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-[var(--line)]"
                  aria-label="다음 곡"
                >
                  <SkipForward size={16} />
                </button>
              </div>
              <div className="hidden min-w-0 items-center gap-2 sm:flex sm:w-64">
                <span className="w-8 text-right font-mono text-[11px] text-[var(--text-muted)]">{formatTrackTime(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(event) => onSeek(Number(event.target.value))}
                  className="h-1 w-full accent-cyan-500"
                  aria-label="재생 위치"
                />
                <span className="w-8 font-mono text-[11px] text-[var(--text-muted)]">{formatTrackTime(duration)}</span>
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <button
                  type="button"
                  onClick={onToggleMute}
                  className="grid h-9 w-9 place-items-center rounded-full border border-[var(--line)]"
                  aria-label={muted || volume === 0 ? "소리 켜기" : "음소거"}
                >
                  {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={(event) => onVolume(Number(event.target.value))}
                  className="h-1 w-24 accent-cyan-500"
                  aria-label="음량"
                />
              </div>
              <button
                type="button"
                onClick={onToggleMute}
                className="grid h-9 w-9 place-items-center rounded-full border border-[var(--line)] md:hidden"
                aria-label={muted || volume === 0 ? "소리 켜기" : "음소거"}
              >
                {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
