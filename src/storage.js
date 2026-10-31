// Small localStorage wrapper for Rewrite100 persistence.
// Every function is safe to call when storage is unavailable (private mode,
// quota errors, no DOM, etc.): reads return defaults and writes are dropped,
// so the app keeps working, it just doesn't save.
//
// An optional `store` argument (default: global localStorage) exists so tests
// can inject a fake.

export const DRAFT_KEY_PREFIX = 'rewrite100:v1:draft:';
export const STATS_KEY = 'rewrite100:v1:stats';
export const LAST_PROBLEM_ID_KEY = 'rewrite100:v1:lastProblemId';
export const INCLUDE_BONUS_KEY = 'rewrite100:v1:includeBonus';

export function draftKey(id) {
  return `${DRAFT_KEY_PREFIX}${id}`;
}

function resolveStore(override) {
  if (override) return override;
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    // No usable global storage.
  }
  return null;
}

function safeGet(store, key) {
  if (!store) return null;
  try {
    const value = store.getItem(key);
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

function safeSet(store, key, value) {
  if (!store) return false;
  try {
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemove(store, key) {
  if (!store) return false;
  try {
    store.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// Drafts: raw right-editor text per problem id.

export function loadDraft(id, store) {
  return safeGet(resolveStore(store), draftKey(id));
}

export function saveDraft(id, text, store) {
  safeSet(resolveStore(store), draftKey(id), String(text ?? ''));
}

export function clearDraft(id, store) {
  safeRemove(resolveStore(store), draftKey(id));
}

// Last opened problem id (round-trips numbers and strings).

export function loadLastProblemId(store) {
  const raw = safeGet(resolveStore(store), LAST_PROBLEM_ID_KEY);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function saveLastProblemId(id, store) {
  safeSet(resolveStore(store), LAST_PROBLEM_ID_KEY, JSON.stringify(id));
}

// "Include bonus" toggle: true/false, null when never saved.

export function loadIncludeBonus(store) {
  const raw = safeGet(resolveStore(store), INCLUDE_BONUS_KEY);
  if (raw === null) return null;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'boolean' ? parsed : null;
  } catch {
    return null;
  }
}

export function saveIncludeBonus(value, store) {
  safeSet(resolveStore(store), INCLUDE_BONUS_KEY, value ? 'true' : 'false');
}

// Per-problem stats: { [id]: { attempts, bestAccuracy, bestTimeMs, lastPracticed } }

export function loadStats(store) {
  const raw = safeGet(resolveStore(store), STATS_KEY);
  if (raw === null) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    return {};
  } catch {
    return {};
  }
}

// Record one completed drill. Attempts always increments; best accuracy keeps
// the max, best time keeps the min. Returns the updated entry for `id`.
// `now` (Date or ISO string) overrides the timestamp; tests use it, the app
// omits it.
export function recordCompletion(id, { accuracy, timeMs } = {}, store, now) {
  const resolved = resolveStore(store);
  const stats = loadStats(resolved);
  const key = String(id);
  const prev = stats[key] && typeof stats[key] === 'object' ? stats[key] : {};
  const prevAttempts = Number.isFinite(prev.attempts) ? prev.attempts : 0;
  const prevBestAccuracy = Number.isFinite(prev.bestAccuracy) ? prev.bestAccuracy : null;
  const prevBestTimeMs = Number.isFinite(prev.bestTimeMs) ? prev.bestTimeMs : null;

  const acc = Number(accuracy);
  const ms = Number(timeMs);
  const entry = {
    attempts: prevAttempts + 1,
    bestAccuracy: Number.isFinite(acc)
      ? (prevBestAccuracy === null ? acc : Math.max(prevBestAccuracy, acc))
      : (prevBestAccuracy ?? 0),
    bestTimeMs: Number.isFinite(ms)
      ? (prevBestTimeMs === null ? ms : Math.min(prevBestTimeMs, ms))
      : (prevBestTimeMs ?? 0),
    lastPracticed:
      now instanceof Date
        ? now.toISOString()
        : (typeof now === 'string' ? now : new Date().toISOString()),
  };
  stats[key] = entry;
  if (resolved) safeSet(resolved, STATS_KEY, JSON.stringify(stats));
  return entry;
}
