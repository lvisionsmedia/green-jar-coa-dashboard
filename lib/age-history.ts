export type AgeHistoryEntry = {
  id: string;
  checkedAt: string;
  status: "ok" | "under";
  age: number;
  idNumber: string;
  birthDisplay: string;
  message: string;
  turns21OnLabel: string | null;
  deviceId: string;
  deviceName: string;
};

const STORAGE_KEY = "gj-age-check-history-v2";
const DEVICE_KEY = "gj-age-clerk-device-id";
const DEVICE_NAME_KEY = "gj-age-clerk-device-name";
const MAX_ENTRIES = 200;
const MAX_DEVICE_NAME = 40;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function newDeviceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `gj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Persistent per-browser install id for the clerk device. Survives Clear history. */
export function getClerkDeviceId(): string {
  if (!canUseStorage()) return newDeviceId();
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing && existing.trim().length > 0) return existing;
    const id = newDeviceId();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return newDeviceId();
  }
}

export function getClerkDeviceName(): string | null {
  if (!canUseStorage()) return null;
  try {
    const existing = localStorage.getItem(DEVICE_NAME_KEY);
    if (!existing) return null;
    const trimmed = existing.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

export function setClerkDeviceName(name: string): string {
  const trimmed = name.trim().slice(0, MAX_DEVICE_NAME);
  if (!trimmed) {
    throw new Error("Device name is required");
  }
  if (canUseStorage()) {
    try {
      localStorage.setItem(DEVICE_NAME_KEY, trimmed);
    } catch {
      // ignore quota
    }
  }
  return trimmed;
}

export function loadAgeHistory(): AgeHistoryEntry[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const deviceId = getClerkDeviceId();
    const deviceName = getClerkDeviceName() ?? "This device";
    return parsed.flatMap((value) => {
      if (!isHistoryEntryRow(value)) return [];
      const row = value as Record<string, unknown>;
      const entryDeviceId =
        typeof row.deviceId === "string" && row.deviceId.trim().length > 0
          ? row.deviceId
          : deviceId;
      const entryDeviceName =
        typeof row.deviceName === "string" && row.deviceName.trim().length > 0
          ? row.deviceName.trim()
          : deviceName;
      return [
        {
          id: row.id as string,
          checkedAt: row.checkedAt as string,
          status: row.status as "ok" | "under",
          age: row.age as number,
          idNumber: row.idNumber as string,
          birthDisplay: row.birthDisplay as string,
          message: row.message as string,
          turns21OnLabel:
            typeof row.turns21OnLabel === "string" ? row.turns21OnLabel : null,
          deviceId: entryDeviceId,
          deviceName: entryDeviceName,
        },
      ];
    });
  } catch {
    return [];
  }
}

function isHistoryEntryRow(value: unknown): boolean {
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
