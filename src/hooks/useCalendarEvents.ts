"use client";

import { CALENDAR_EVENTS, type CalendarEvent } from "@/data/schedule";
import { listCalendarEvents } from "@/lib/calendar-events";
import { useEffect, useState } from "react";

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>(CALENDAR_EVENTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingFallback, setIsUsingFallback] = useState(true);

  const applyEvents = (nextEvents: CalendarEvent[]) => {
    const hasServerData = nextEvents.length > 0;
    setIsUsingFallback(!hasServerData);
    setEvents(hasServerData ? nextEvents : CALENDAR_EVENTS);
  };

  const reload = async () => {
    try {
      applyEvents(await listCalendarEvents());
    } catch {
      setIsUsingFallback(true);
      setEvents(CALENDAR_EVENTS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const nextEvents = await listCalendarEvents();
        if (!cancelled) {
          applyEvents(nextEvents);
        }
      } catch {
        if (!cancelled) {
          setIsUsingFallback(true);
          setEvents(CALENDAR_EVENTS);
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

  return { events, isLoading, isUsingFallback, reload, setEvents };
}
