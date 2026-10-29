import type { CloudState } from "./types";

export const CLOUD_STORAGE_KEY = "expense-tracker:cloud:v1";
export const MAX_HISTORY = 100;

export const EMPTY_CLOUD_STATE: CloudState = {
  version: 1,
  connections: [],
  schedules: [],
  jobs: [],
  shares: [],
  backup: { at: null, destination: null, pending: 0 },
};

/** Loads saved cloud settings, falling back to an empty state if they're missing or unreadable. */
export function loadCloudState(): CloudState {
  try {
    const raw = window.localStorage.getItem(CLOUD_STORAGE_KEY);
    if (!raw) return EMPTY_CLOUD_STATE;
    const parsed = JSON.parse(raw) as Partial<CloudState>;
    if (parsed?.version !== 1) return EMPTY_CLOUD_STATE;
    const list = <T,>(v: T[] | undefined) => (Array.isArray(v) ? v : []);
    return {
      version: 1,
      connections: list(parsed.connections),
      schedules: list(parsed.schedules),
      jobs: list(parsed.jobs),
      shares: list(parsed.shares),
      backup: { ...EMPTY_CLOUD_STATE.backup, ...parsed.backup },
    };
  } catch {
    return EMPTY_CLOUD_STATE;
  }
}

/** Throws a user-readable Error when the write fails. */
export function saveCloudState(state: CloudState): void {
  try {
    window.localStorage.setItem(CLOUD_STORAGE_KEY, JSON.stringify({ ...state, jobs: state.jobs.slice(0, MAX_HISTORY) }));
  } catch {
    throw new Error("Couldn't save export settings to browser storage.");
  }
}
