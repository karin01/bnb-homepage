"use client";

import { type ResourceItem } from "@/data/resources";
import { listResources } from "@/lib/resources";
import { useEffect, useState } from "react";

export function useResources() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const reload = async () => {
    setErrorMessage("");
    try {
      setResources(await listResources());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "자료실을 불러오지 못했습니다.");
      setResources([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const nextResources = await listResources();
        if (!cancelled) {
          setResources(nextResources);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "자료실을 불러오지 못했습니다.");
          setResources([]);
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

  return { resources, isLoading, errorMessage, reload, setResources };
}
