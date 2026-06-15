import collMap, { collGroups } from '@/data/coll';
import type { TestCase } from '@/data/types';
import { CollCard } from './coll-card';

interface CollAnswerOptionsProps {
  currentCase: TestCase;
  currentGuess: string | null;
  checkIsCorrect(case_: TestCase, guess: string | null): boolean;
  takeGuess(guess: string): void;
}

export function CollAnswerOptions({
  currentCase,
  currentGuess,
  checkIsCorrect,
  takeGuess,
}: CollAnswerOptionsProps) {
  const group = currentCase.alg.name.split('/')[0];
  const options = collGroups[group].map((name) => ({
    name: `${group}/${name}`,
    alg: collMap[group][name],
  }));

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {options.map((alg, i) => (
        <CollCard
          key={alg.name}
          alg={alg}
          currentCase={currentCase}
          currentGuess={currentGuess}
          checkIsCorrect={checkIsCorrect}
          onClick={() => takeGuess((i + 1).toString())}
        />
      ))}
    </div>
  );
}
