"use client";

import { WEEKLY_LECTURES, type LectureSlot } from "@/data/schedule";
import { listLectures } from "@/lib/lectures";
import { useEffect, useState } from "react";

export function useLectures() {
  const [lectures, setLectures] = useState<LectureSlot[]>(WEEKLY_LECTURES);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingFallback, setIsUsingFallback] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const applyLectures = (nextLectures: LectureSlot[]) => {
    const hasServerData = nextLectures.length > 0;
    setIsUsingFallback(!hasServerData);
    setLectures(hasServerData ? nextLectures : WEEKLY_LECTURES);
  };

  const reload = async () => {
    setErrorMessage("");
    try {
      applyLectures(await listLectures());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "시간표를 불러오지 못했습니다.");
      setIsUsingFallback(true);
      setLectures(WEEKLY_LECTURES);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadLectures = async () => {
      try {
        const nextLectures = await listLectures();
        if (cancelled) return;
        applyLectures(nextLectures);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "시간표를 불러오지 못했습니다.");
        setIsUsingFallback(true);
        setLectures(WEEKLY_LECTURES);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadLectures();
    return () => {
      cancelled = true;
    };
  }, []);

  return { lectures, isLoading, isUsingFallback, errorMessage, reload, setLectures };
}
