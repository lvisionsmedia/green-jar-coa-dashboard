export type AgeHistoryEntry = {
  id: string;
  checkedAt: string;
  status: "ok" | "under";
  age: number;
  idNumber: string;
  birthDisplay: string;
  message: string;
  turns21OnLabel: string | null;
};

const STORAGE_KEY = "gj-age-check-history-v2";
const MAX_ENTRIES = 200;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadAgeHistory(): AgeHistoryEntry[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryEntry);
  } catch {
    return [];
  }
}

function isHistoryEntry(value: unknown): value is AgeHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.checkedAt === "string" &&
    (row.status === "ok" || row.status === "under") &&
    typeof row.age === "number" &&
    typeof row.idNumber === "string" &&
    row.idNumber.trim().length > 0 &&
    typeof row.birthDisplay === "string" &&
    typeof row.message === "string"
  );
}

export function saveAgeHistory(entries: AgeHistoryEntry[]): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Quota or private mode — ignore
  }
}

export function appendAgeHistory(
  entry: Omit<AgeHistoryEntry, "id">,
): AgeHistoryEntry[] {
  const next: AgeHistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  const list = [next, ...loadAgeHistory()].slice(0, MAX_ENTRIES);
  saveAgeHistory(list);
  return list;
}

export function clearAgeHistory(): AgeHistoryEntry[] {
  if (canUseStorage()) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  return [];
}

export function formatBirthDisplay(month: string, day: string, year: string): string {
  const m = month.padStart(2, "0");
  const d = day.padStart(2, "0");
  return `${m}/${d}/${year}`;
}

export function formatCheckedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
