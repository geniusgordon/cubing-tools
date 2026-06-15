import { cn } from '@/lib/utils';
import { CubeImage } from '@/components/cube-image';
import type { Alg } from '@/data/types';

interface ZbllCaseProps {
  alg: Alg;
  selected: boolean;
  onSelect(alg: Alg): void;
}

export function ZbllCase({ alg, selected, onSelect }: ZbllCaseProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(alg)}
      className={cn(
        'cursor-pointer rounded-md p-1 transition-colors',
        selected && 'bg-green-300',
      )}
    >
      <CubeImage alg={alg.alg} size={80} view="plan" />
    </button>
  );
}
