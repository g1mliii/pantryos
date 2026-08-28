import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

export type AgentActivityStatus =
  "running" | "success" | "error" | "declined" | "cancelled";

export interface AgentActivityEntry {
  durationMs?: number;
  id: number;
  input: Record<string, unknown>;
  startedAt: string;
  status: AgentActivityStatus;
  summary: string;
  toolName: string;
}

interface AgentActivityState {
  entries: AgentActivityEntry[];
}

const MAX_ENTRIES = 10;
const MAX_KEYS = 12;
const MAX_STRING_LENGTH = 80;
const REDACTED_KEY = /authorization|cookie|credential|password|secret|token/i;

let nextActivityId = 1;

export const agentActivityStore = createStore<AgentActivityState>()(() => ({
  entries: [],
}));

function boundedValue(value: unknown, depth = 0): unknown {
  if (depth >= 2) return "[nested]";
  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH - 1)}…`
      : value;
  }
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 5).map((item) => boundedValue(item, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, MAX_KEYS)
        .map(([key, child]) => [
          key,
          REDACTED_KEY.test(key)
            ? "[redacted]"
            : boundedValue(child, depth + 1),
        ]),
    );
  }
  return String(value).slice(0, MAX_STRING_LENGTH);
}

export function redactActivityInput(input: unknown): Record<string, unknown> {
  const bounded = boundedValue(input);
  return bounded && typeof bounded === "object" && !Array.isArray(bounded)
    ? (bounded as Record<string, unknown>)
    : {};
}

export function beginAgentActivity(
  toolName: string,
  input: unknown,
  now = new Date(),
) {
  const id = nextActivityId++;
  const entry: AgentActivityEntry = {
    id,
    input: redactActivityInput(input),
    startedAt: now.toISOString(),
    status: "running",
    summary: "Working…",
    toolName,
  };
  agentActivityStore.setState((state) => ({
    entries: [entry, ...state.entries].slice(0, MAX_ENTRIES),
  }));
  return id;
}

export function finishAgentActivity(
  id: number,
  status: Exclude<AgentActivityStatus, "running">,
  summary: string,
  now = new Date(),
) {
  agentActivityStore.setState((state) => ({
    entries: state.entries.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            durationMs: Math.max(
              0,
              now.getTime() - new Date(entry.startedAt).getTime(),
            ),
            status,
            summary: summary.slice(0, 180),
          }
        : entry,
    ),
  }));
}

export function clearAgentActivity() {
  agentActivityStore.setState({ entries: [] });
}

export function useAgentActivityStore<T>(
  selector: (state: AgentActivityState) => T,
) {
  return useStore(agentActivityStore, selector);
}
