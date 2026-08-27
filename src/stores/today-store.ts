import { isSameDay } from "date-fns";
import { useEffect } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

const DAY_CHECK_INTERVAL_MS = 60_000;

interface TodayState {
  today: Date;
}

export const todayStore = createStore<TodayState>()(() => ({
  today: new Date(),
}));

let timer: ReturnType<typeof setInterval> | undefined;
let consumers = 0;

function tick() {
  const now = new Date();
  if (isSameDay(todayStore.getState().today, now)) return;
  todayStore.setState({ today: now });
}

function startTicking() {
  consumers += 1;
  timer ??= setInterval(tick, DAY_CHECK_INTERVAL_MS);
}

function stopTicking() {
  consumers -= 1;
  if (consumers > 0 || !timer) return;
  clearInterval(timer);
  timer = undefined;
}

/**
 * The current day, kept honest while the page stays open.
 *
 * A `new Date()` captured once at mount goes stale at midnight: a recording
 * session left running would keep showing yesterday's "TODAY" markers and
 * yesterday's Use First order. One store rather than a timer per screen, so
 * every screen turns the day over at the same moment. The Date identity is
 * stable within a day, so memoised expiry work is not redone every render.
 */
export function useToday() {
  useEffect(() => {
    startTicking();
    return stopTicking;
  }, []);
  return useStore(todayStore, (state) => state.today);
}
