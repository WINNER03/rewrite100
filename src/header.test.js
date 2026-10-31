import { describe, it, expect } from 'vitest';
import { buildHeader } from './header.js';

describe('buildHeader', () => {
  const problem = {
    id: 1,
    title: 'Two Sum',
    statement: 'Return the indices of the two numbers that add up to target.',
    steps: ['Build a map.', 'Scan once.'],
    time: 'O(n)',
    space: 'O(n)',
  };

  it('builds the exact comment-styled header block', () => {
    expect(buildHeader(problem)).toBe(
      [
        '/*',
        '1. Two Sum',
        'Problem Statement: Return the indices of the two numbers that add up to target.',
        'Solution Steps:',
        '1. Build a map.',
        '2. Scan once.',
        'Time: O(n) | Space: O(n)',
        '*/',
      ].join('\n')
    );
  });

  it('numbers every step starting at 1', () => {
    const header = buildHeader({ ...problem, steps: ['a', 'b', 'c'] });
    expect(header).toContain('1. a\n2. b\n3. c');
  });
});
