import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CubeImage } from '@/components/cube-image';
import { collGroups } from '@/data/coll';
import type { Alg } from '@/data/types';

interface AlgGroupProps {
  active?: boolean;
  alg: Alg;
  stage: 'oll' | 'coll';
  selectedCount: Record<string, number>;
  onSelect(alg: Alg): void;
  onAllClick(alg: Alg): void;
  onNoneClick(alg: Alg): void;
}

export function AlgGroup({
  active,
  alg,
  stage,
  selectedCount,
  onSelect,
  onAllClick,
  onNoneClick,
}: AlgGroupProps) {
  const oll = alg.name.split('/')[0];
  const count = selectedCount[alg.name] || 0;
  const total = stage === 'oll' ? collGroups[oll].length * 12 : 12;

  return (
    <div className="m-1 flex flex-col items-center">
      <button
        type="button"
        onClick={() => onSelect(alg)}
        className={cn(
          'relative cursor-pointer rounded-md p-1 transition-colors',
          active && 'bg-green-300',
        )}
      >
        <CubeImage alg={alg.alg} size={100} stage={stage} view="plan" />
        <span className="absolute bottom-0 right-0 rounded bg-neutral-600 px-1 text-xs text-neutral-50">
          {count} / {total}
        </span>
      </button>
      <div className="flex h-9 items-center">
        {active && (
          <>
            <Button variant="ghost" size="sm" onClick={() => onAllClick(alg)}>
              All
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onNoneClick(alg)}>
              None
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
