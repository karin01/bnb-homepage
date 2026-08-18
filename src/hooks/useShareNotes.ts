"use client";

import { type ShareNoteItem } from "@/data/share-notes";
import { listShareNotes } from "@/lib/share-notes";
import { useEffect, useState } from "react";

export function useShareNotes() {
  const [notes, setNotes] = useState<ShareNoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const reload = async () => {
    setErrorMessage("");
    try {
      setNotes(await listShareNotes());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "쉐어노트를 불러오지 못했습니다.");
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const nextNotes = await listShareNotes();
        if (!cancelled) {
          setNotes(nextNotes);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "쉐어노트를 불러오지 못했습니다.");
          setNotes([]);
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

  return { notes, isLoading, errorMessage, reload, setNotes };
}
