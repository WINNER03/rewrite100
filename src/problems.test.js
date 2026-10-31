import { describe, it, expect } from 'vitest';
import { problems } from './problems.js';

describe('problems data', () => {
  it('has 117 problems: 100 core and 17 bonus', () => {
    expect(problems).toHaveLength(117);
    expect(problems.filter((p) => p.group === 'core')).toHaveLength(100);
    expect(problems.filter((p) => p.group === 'bonus')).toHaveLength(17);
  });

  it('has unique ids', () => {
    const ids = problems.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every entry non-empty title, statement, steps, time, space, solution and drill', () => {
    for (const p of problems) {
      const tag = `problem id ${p.id}`;
      expect(p.title, `${tag} title`).toBeTruthy();
      expect(p.statement, `${tag} statement`).toBeTruthy();
      expect(Array.isArray(p.steps), `${tag} steps is array`).toBe(true);
      expect(p.steps.length, `${tag} steps non-empty`).toBeGreaterThan(0);
      for (const step of p.steps) {
        expect(step, `${tag} step`).toBeTruthy();
      }
      expect(p.time, `${tag} time`).toBeTruthy();
      expect(p.space, `${tag} space`).toBeTruthy();
      expect(p.solution, `${tag} solution`).toBeTruthy();
      expect(p.drill, `${tag} drill`).toBeTruthy();
    }
  });

  it('gives every entry a valid group and author', () => {
    for (const p of problems) {
      expect(['core', 'bonus'], `problem id ${p.id} group`).toContain(p.group);
      expect(['you', 'claude'], `problem id ${p.id} author`).toContain(p.author);
    }
  });
});
