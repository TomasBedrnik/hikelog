const STORAGE_KEY = "hikelog.seenActivities.v1";

type SeenActivitiesStorage = Record<string, number[]>;

function readStorage(): SeenActivitiesStorage {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as SeenActivitiesStorage;
  } catch {
    return {};
  }
}

function writeStorage(value: SeenActivitiesStorage) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage failures; the site should remain usable in private or restricted contexts.
  }
}

export function getSeenActivityIds(tripId: number) {
  const storage = readStorage();
  const ids = storage[String(tripId)] ?? [];
  return new Set(ids.filter((id) => Number.isInteger(id)));
}

export function markActivitySeen(tripId: number, activityId: number) {
  const storage = readStorage();
  const storageKey = String(tripId);
  const seenIds = new Set(storage[storageKey] ?? []);
  seenIds.add(activityId);
  storage[storageKey] = [...seenIds].sort((left, right) => left - right);
  writeStorage(storage);
}
