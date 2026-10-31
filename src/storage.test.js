import { describe, it, expect, beforeEach } from 'vitest';
import {
  DRAFT_KEY_PREFIX,
  STATS_KEY,
  LAST_PROBLEM_ID_KEY,
  INCLUDE_BONUS_KEY,
  draftKey,
  loadDraft,
  saveDraft,
  clearDraft,
  loadLastProblemId,
  saveLastProblemId,
  loadIncludeBonus,
  saveIncludeBonus,
  loadStats,
  recordCompletion,
} from './storage.js';

// Minimal fake localStorage.
function createFakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
  };
}

function createThrowingStorage() {
  const fail = () => {
    throw new Error('storage unavailable');
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

describe('drafts', () => {
  let store;
  beforeEach(() => {
    store = createFakeStorage();
  });

  it('uses the required key format', () => {
    expect(DRAFT_KEY_PREFIX).toBe('rewrite100:v1:draft:');
    expect(draftKey(42)).toBe('rewrite100:v1:draft:42');
  });

  it('saves and restores draft text per problem id', () => {
    saveDraft(1, 'const a = 1;', store);
    saveDraft(2, 'const b = 2;', store);
    expect(store.getItem('rewrite100:v1:draft:1')).toBe('const a = 1;');
    expect(loadDraft(1, store)).toBe('const a = 1;');
    expect(loadDraft(2, store)).toBe('const b = 2;');
  });

  it('returns null when no draft exists', () => {
    expect(loadDraft(999, store)).toBeNull();
  });

  it('clears a draft', () => {
    saveDraft(1, 'x', store);
    clearDraft(1, store);
    expect(loadDraft(1, store)).toBeNull();
    expect(store.getItem('rewrite100:v1:draft:1')).toBeNull();
  });

  it('clearing a missing draft does not throw', () => {
    expect(() => clearDraft(123, store)).not.toThrow();
  });
});

describe('last opened problem id', () => {
  let store;
  beforeEach(() => {
    store = createFakeStorage();
  });

  it('round-trips a numeric id', () => {
    saveLastProblemId(7, store);
    expect(loadLastProblemId(store)).toBe(7);
  });

  it('returns null when never saved', () => {
    expect(loadLastProblemId(store)).toBeNull();
  });

  it('uses a rewrite100-namespaced key', () => {
    saveLastProblemId(3, store);
    expect(LAST_PROBLEM_ID_KEY.startsWith('rewrite100:v1:')).toBe(true);
    expect(store.getItem(LAST_PROBLEM_ID_KEY)).not.toBeNull();
  });
});

describe('include bonus toggle', () => {
  let store;
  beforeEach(() => {
    store = createFakeStorage();
  });

  it('round-trips true and false', () => {
    saveIncludeBonus(true, store);
    expect(loadIncludeBonus(store)).toBe(true);
    saveIncludeBonus(false, store);
    expect(loadIncludeBonus(store)).toBe(false);
  });

  it('returns null when never saved', () => {
    expect(loadIncludeBonus(store)).toBeNull();
  });

  it('uses a rewrite100-namespaced key', () => {
    saveIncludeBonus(true, store);
    expect(INCLUDE_BONUS_KEY.startsWith('rewrite100:v1:')).toBe(true);
    expect(store.getItem(INCLUDE_BONUS_KEY)).not.toBeNull();
  });
});

describe('stats', () => {
  let store;
  beforeEach(() => {
    store = createFakeStorage();
  });

  it('uses the required stats key', () => {
    expect(STATS_KEY).toBe('rewrite100:v1:stats');
  });

  it('returns an empty object when no stats exist', () => {
    expect(loadStats(store)).toEqual({});
  });

  it('returns an empty object for corrupt stats', () => {
    store.setItem(STATS_KEY, 'not json{{{');
    expect(loadStats(store)).toEqual({});
    store.setItem(STATS_KEY, '"a string"');
    expect(loadStats(store)).toEqual({});
  });

  it('records the first completion', () => {
    const entry = recordCompletion(
      7,
      { accuracy: 80, timeMs: 60000 },
      store,
      '2026-01-01T00:00:00.000Z'
    );
    expect(entry).toEqual({
      attempts: 1,
      bestAccuracy: 80,
      bestTimeMs: 60000,
      lastPracticed: '2026-01-01T00:00:00.000Z',
    });
    const persisted = JSON.parse(store.getItem(STATS_KEY));
    expect(persisted['7']).toEqual(entry);
  });

  it('increments attempts and keeps the best accuracy and time', () => {
    recordCompletion(7, { accuracy: 80, timeMs: 60000 }, store, '2026-01-01T00:00:00.000Z');
    const second = recordCompletion(
      7,
      { accuracy: 95, timeMs: 90000 },
      store,
      '2026-01-02T00:00:00.000Z'
    );
    expect(second.attempts).toBe(2);
    expect(second.bestAccuracy).toBe(95);
    expect(second.bestTimeMs).toBe(60000);
    expect(second.lastPracticed).toBe('2026-01-02T00:00:00.000Z');
  });

  it('keeps separate entries per problem id', () => {
    recordCompletion(1, { accuracy: 90, timeMs: 1000 }, store);
    recordCompletion(2, { accuracy: 50, timeMs: 2000 }, store);
    const stats = loadStats(store);
    expect(stats['1'].attempts).toBe(1);
    expect(stats['2'].attempts).toBe(1);
    expect(stats['1'].bestAccuracy).toBe(90);
    expect(stats['2'].bestAccuracy).toBe(50);
  });

  it('defaults lastPracticed to an ISO date', () => {
    const entry = recordCompletion(8, { accuracy: 100, timeMs: 1000 }, store);
    expect(new Date(entry.lastPracticed).toISOString()).toBe(entry.lastPracticed);
  });
});

describe('storage failure', () => {
  let bad;
  beforeEach(() => {
    bad = createThrowingStorage();
  });

  it('reads return defaults instead of throwing', () => {
    expect(loadDraft(1, bad)).toBeNull();
    expect(loadLastProblemId(bad)).toBeNull();
    expect(loadIncludeBonus(bad)).toBeNull();
    expect(loadStats(bad)).toEqual({});
  });

  it('writes are dropped instead of throwing', () => {
    expect(() => saveDraft(1, 'x', bad)).not.toThrow();
    expect(() => clearDraft(1, bad)).not.toThrow();
    expect(() => saveLastProblemId(1, bad)).not.toThrow();
    expect(() => saveIncludeBonus(true, bad)).not.toThrow();
  });

  it('recordCompletion still returns the entry when it cannot persist', () => {
    let entry;
    expect(() => {
      entry = recordCompletion(1, { accuracy: 90, timeMs: 1000 }, bad);
    }).not.toThrow();
    expect(entry.attempts).toBe(1);
    expect(entry.bestAccuracy).toBe(90);
  });
});
