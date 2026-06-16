import { describe, expect, it } from 'vitest';
import { ollCases, ollCategories } from './oll';

describe('oll dataset', () => {
  it('has all 57 cases with unique numbers 1..57', () => {
    expect(ollCases).toHaveLength(57);
    const numbers = ollCases.map((c) => c.number).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 57 }, (_, i) => i + 1));
  });

  it('has unique case names', () => {
    const names = new Set(ollCases.map((c) => c.name));
    expect(names.size).toBe(57);
  });

  it('assigns every case a category from ollCategories', () => {
    for (const c of ollCases) {
      expect(ollCategories).toContain(c.category);
    }
  });

  it('uses every declared category at least once', () => {
    const used = new Set(ollCases.map((c) => c.category));
    for (const cat of ollCategories) {
      expect(used).toContain(cat);
    }
  });

  it('has a non-empty alg for every case', () => {
    for (const c of ollCases) {
      expect(c.alg.trim().length).toBeGreaterThan(0);
    }
  });
});
