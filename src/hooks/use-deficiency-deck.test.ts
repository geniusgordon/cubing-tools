import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useDeficiencyDeck from './use-deficiency-deck';
import type { FlashCard } from '@/data/types';

afterEach(() => window.localStorage.clear());

const defaultMap: Record<string, FlashCard<{ alg: string }>> = {
  a: { data: { alg: 'Ra' }, deficiency: 1 },
  b: { data: { alg: 'Rb' }, deficiency: 1 },
};

describe('useDeficiencyDeck', () => {
  it('pick returns a name+data from the enabled set', () => {
    const { result } = renderHook(() => useDeficiencyDeck('deck-test-1', defaultMap, 0.5));
    const picked = result.current.pick(['a']);
    expect(picked).toEqual({ name: 'a', data: { alg: 'Ra' } });
  });

  it('record(correct) shrinks deficiency, record(wrong) grows it, persisted to localStorage', () => {
    const { result } = renderHook(() => useDeficiencyDeck('deck-test-2', defaultMap, 0.5));
    act(() => result.current.record('a', true)); // 1 * (1 - 0.5) = 0.5
    act(() => result.current.record('b', false)); // 1 * (1 + 0.5) = 1.5
    const stored = JSON.parse(
      window.localStorage.getItem('@cubing-tools/deck-test-2') as string,
    );
    expect(stored.a.deficiency).toBeCloseTo(0.5);
    expect(stored.b.deficiency).toBeCloseTo(1.5);
  });

  it('tolerates a stale stored map missing keys', () => {
    window.localStorage.setItem(
      '@cubing-tools/deck-test-3',
      JSON.stringify({ a: { data: { alg: 'Ra' }, deficiency: 4 } }),
    );
    const { result } = renderHook(() => useDeficiencyDeck('deck-test-3', defaultMap, 0.5));
    // 'b' is missing from storage -> falls back to default without throwing.
    expect(result.current.pick(['b'])).toEqual({ name: 'b', data: { alg: 'Rb' } });
  });
});
