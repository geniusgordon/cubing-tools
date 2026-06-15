import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { collGroups } from '@/data/coll';
import { CubeImage } from '@/components/cube-image';
import type { Alg, TestCase } from '@/data/types';

interface CollCardProps {
  alg: Alg;
  currentCase: TestCase;
  currentGuess: string | null;
  checkIsCorrect(case_: TestCase, guess: string | null): boolean;
  onClick(): void;
}

function checkIsCurrent(
  case_: TestCase,
  guess: string | null,
  alg: Alg,
): boolean {
  if (!guess) {
    return false;
  }
  const group = case_.alg.name.split('/')[0];
  const options = collGroups[group].map(name => `${group}/${name}`);
  return options[parseInt(guess) - 1] === alg.name;
}

export function CollCard({
  alg,
  currentCase,
  currentGuess,
  checkIsCorrect,
  onClick,
}: CollCardProps) {
  const isCurrent = checkIsCurrent(currentCase, currentGuess, alg);
  const isCorrect = checkIsCorrect(currentCase, currentGuess);

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer overflow-hidden transition-colors hover:bg-accent"
    >
      <CardContent className="flex flex-col items-center gap-2 p-3">
        <CubeImage alg={alg.alg} size={100} view="plan" stage="coll" />
        <span
          className={cn(
            'rounded px-2 py-1 text-lg font-medium',
            isCurrent && isCorrect && 'bg-green-600 text-white',
            isCurrent && !isCorrect && 'bg-red-600 text-white',
          )}
        >
          {alg.name.split('/')[1]}
        </span>
      </CardContent>
    </Card>
  );
}
