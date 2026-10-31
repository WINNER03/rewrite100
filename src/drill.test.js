import { describe, it, expect } from 'vitest';
import {
  stripWhitespace,
  strippedIndexMap,
  compare,
  calcAccuracy,
  computeCpm,
  formatTime,
} from './drill.js';

describe('stripWhitespace', () => {
  it('removes spaces, tabs and newlines', () => {
    expect(stripWhitespace('a b\tc\nd\r\n e')).toBe('abcde');
  });
});

describe('strippedIndexMap', () => {
  it('maps stripped indexes back to original offsets', () => {
    expect(strippedIndexMap('a b\n c')).toEqual([0, 2, 5]);
  });
});

describe('compare', () => {
  const ref = 'function f() {\n  return 1;\n}';

  it('matches identical strings', () => {
    const r = compare(ref, ref);
    expect(r.isMatch).toBe(true);
    expect(r.firstMismatch).toBeNull();
    expect(r.matchedCount).toBe(r.refLength);
  });

  it('ignores whitespace differences', () => {
    const r = compare(ref, 'function f(){return 1;}');
    expect(r.isMatch).toBe(true);
    expect(r.firstMismatch).toBeNull();
  });

  it('ignores extra whitespace in typed text', () => {
    const r = compare('ab', 'a   b\n\n');
    expect(r.isMatch).toBe(true);
  });

  it('reports a correct partial prefix as in-progress', () => {
    const r = compare(ref, 'function f() {\n  return');
    expect(r.isMatch).toBe(false);
    expect(r.firstMismatch).toBeNull();
    expect(r.matchedCount).toBeLessThan(r.refLength);
  });

  it('reports empty typed text as in-progress', () => {
    const r = compare(ref, '');
    expect(r.isMatch).toBe(false);
    expect(r.firstMismatch).toBeNull();
    expect(r.matchedCount).toBe(0);
  });

  it('finds the first wrong character', () => {
    const r = compare('abcdef', 'abXdef');
    expect(r.isMatch).toBe(false);
    expect(r.firstMismatch).toEqual({ expected: 'c', actual: 'X', typedOffset: 2 });
    expect(r.matchedCount).toBe(2);
  });

  it('skips whitespace when locating the mismatch', () => {
    const r = compare('return 1;', 'return   2;');
    expect(r.isMatch).toBe(false);
    // '2' sits at original offset 9 in the typed string
    expect(r.firstMismatch).toEqual({ expected: '1', actual: '2', typedOffset: 9 });
  });

  it('flags extra characters past the end', () => {
    const r = compare('ab', 'ab;');
    expect(r.isMatch).toBe(false);
    expect(r.firstMismatch).toEqual({ expected: null, actual: ';', typedOffset: 2 });
  });

  it('treats whitespace-only typed text as empty', () => {
    const r = compare('ab', '  \n\t ');
    expect(r.isMatch).toBe(false);
    expect(r.firstMismatch).toBeNull();
    expect(r.typedLength).toBe(0);
  });
});

describe('calcAccuracy', () => {
  it('returns 100 with no keystrokes', () => {
    expect(calcAccuracy(0, 0)).toBe(100);
  });

  it('computes the correct percentage', () => {
    expect(calcAccuracy(5, 100)).toBe(95);
    expect(calcAccuracy(0, 50)).toBe(100);
  });

  it('floors at zero', () => {
    expect(calcAccuracy(120, 100)).toBe(0);
  });
});

describe('computeCpm', () => {
  it('computes characters per minute', () => {
    expect(computeCpm(120, 60000)).toBe(120);
    expect(computeCpm(60, 30000)).toBe(120);
    expect(computeCpm(100, 60000)).toBeCloseTo(100);
  });

  it('returns 0 for empty input', () => {
    expect(computeCpm(0, 1000)).toBe(0);
    expect(computeCpm(10, 0)).toBe(0);
  });
});

describe('formatTime', () => {
  it('formats mm:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65000)).toBe('1:05');
    expect(formatTime(600000)).toBe('10:00');
  });
});
