"use client";

import { REGISTERED_SUBJECTS, type RegisteredSubject } from "@/data/subjects";
import { type ArchiveRoomId } from "@/data/resources";
import { listRegisteredSubjects } from "@/lib/subjects";
import { useEffect, useMemo, useState } from "react";

/** 학습일정과 같은 과목 목록을 자료실 업로드에서 고를 수 있게 불러옵니다. */
export function useRegisteredSubjects(room?: ArchiveRoomId) {
  const [subjects, setSubjects] = useState<RegisteredSubject[]>(
    REGISTERED_SUBJECTS.filter((subject) => !subject.hidden),
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const nextSubjects = await listRegisteredSubjects();
        if (!cancelled) {
          setSubjects(nextSubjects);
        }
      } catch {
        if (!cancelled) {
          setSubjects(REGISTERED_SUBJECTS);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const names = useMemo(() => {
    if (!room) {
      return [];
    }
    const uniqueNames = new Set<string>();
    subjects.forEach((subject) => {
      if (subject.grade === room && !uniqueNames.has(subject.name)) {
        uniqueNames.add(subject.name);
      }
    });
    return [...uniqueNames].sort((left, right) => left.localeCompare(right, "ko"));
  }, [room, subjects]);

  return { names, isLoading };
}
