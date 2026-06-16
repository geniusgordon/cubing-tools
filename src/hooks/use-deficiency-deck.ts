import { useCallback } from 'react';
import useLocalStorage from './use-local-storage';
import { randomChoice } from '@/lib/cube';
import type { FlashCard } from '@/data/types';

export interface DeficiencyDeck<T> {
  pick(enabledNames: string[]): { name: string; data: T };
  record(name: string, correct: boolean): void;
}

export default function useDeficiencyDeck<T>(
  storageKey: string,
  defaultMap: Record<string, FlashCard<T>>,
  gamma = 0.5,
): DeficiencyDeck<T> {
  const [map, setMap] =
    useLocalStorage<Record<string, FlashCard<T>>>(storageKey, defaultMap);

  const pick = useCallback(
    (enabledNames: string[]) => {
      const names = enabledNames.length ? enabledNames : Object.keys(defaultMap);
      const weights = names.map((n) => map[n]?.deficiency ?? 1);
      const name = randomChoice(names, weights);
      // Data (alg identity) is static — always read it from defaultMap so a
      // partial/stale persisted map can never break consumers. Only the
      // deficiency weight is sourced from the stored map.
      const data = defaultMap[name].data;
      return { name, data };
    },
    [map, defaultMap],
  );

  const record = useCallback(
    (name: string, correct: boolean) => {
      const card = map[name] ?? defaultMap[name];
      if (!card) return;
      const deficiency = correct
        ? card.deficiency * (1 - gamma)
        : card.deficiency * (1 + gamma);
      setMap({ ...map, [name]: { ...card, deficiency } });
    },
    [map, defaultMap, gamma, setMap],
  );

  return { pick, record };
}
