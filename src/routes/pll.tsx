import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import pllMap, { pllGroups, pllAlgs } from '@/data/pll';
import type { AlgWithAuf, FlashCard, TestCase } from '@/data/types';
import { RecognitionTrainer } from './recognition-trainer';

const defaultFlashCardMap: Record<string, FlashCard<AlgWithAuf>> = {};
pllAlgs.slice(0, 1).forEach((alg) =>
  [...new Array(4)].forEach((_, i) => {
    const name = `${alg.name}-${i}`;
    defaultFlashCardMap[name] = {
      data: { name, alg: alg.alg, preAuf: i },
      deficiency: 1,
    };
  }),
);

function checkKeyInCases(_case: TestCase, key: string): boolean {
  if (/[a-zA-Z]/.test(key)) {
    return Object.keys(pllMap).includes(key);
  }
  return false;
}

function checkIsCorrect(case_: TestCase, guess: string | null): boolean {
  return case_.alg.name[0] === guess;
}

export default function PllRecognitionTrainer() {
  return (
    <RecognitionTrainer
      title="PLL Recognition Trainer"
      flashCardName="pll-recognition"
      defaultFlashCardMap={defaultFlashCardMap}
      checkKeyInCases={checkKeyInCases}
      checkIsCorrect={checkIsCorrect}
      renderAnswerOptions={({ currentCase, currentGuess, takeGuess }) => (
        <div className="flex flex-col items-center gap-2">
          {pllGroups.map((group) => (
            <div
              key={group.name}
              className="flex flex-wrap justify-center gap-2"
            >
              {group.cases.map((c) => {
                const isCurrent = currentGuess === c;
                const isCorrect = checkIsCorrect(currentCase, currentGuess);
                return (
                  <Button
                    key={c}
                    onClick={() => takeGuess(c)}
                    className={cn(
                      isCurrent &&
                        isCorrect &&
                        'bg-green-600 hover:bg-green-600',
                      isCurrent && !isCorrect && 'bg-red-600 hover:bg-red-600',
                    )}
                  >
                    {c}
                  </Button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    />
  );
}
