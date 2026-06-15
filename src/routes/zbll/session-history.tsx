import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CubeImage } from '@/components/cube-image';
import type { History } from '@/data/types';
import { inverseAlg, formatTime, averageOfN } from '@/lib/cube';

interface SessionHistoryProps {
  sessionHistory: History[];
  onDelete(index: number): void;
  onClear(): void;
}

type Alert = 'delete' | 'clear' | null;

function Stat({ title, time }: { title: string; time: number | null }) {
  if (time === null) return null;
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{title}</span>
      <span className="text-xl font-medium tabular-nums">
        {formatTime(time)}
      </span>
    </div>
  );
}

export function SessionHistory({
  sessionHistory,
  onDelete,
  onClear,
}: SessionHistoryProps) {
  const [alert, setAlert] = useState<Alert>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // keep the latest solve selected as history grows/shrinks (original behavior)
  useEffect(() => {
    setSelectedIndex(sessionHistory.length - 1);
  }, [sessionHistory.length]);

  const times = sessionHistory.map((h) => h.time);
  const best = times.length ? Math.min(...times) : null;
  const worst = times.length ? Math.max(...times) : null;
  const ao5 = averageOfN(times, 5);
  const ao12 = averageOfN(times, 12);

  const selected = sessionHistory[selectedIndex];

  function confirm() {
    if (alert === 'delete') onDelete(selectedIndex);
    else if (alert === 'clear') onClear();
    setAlert(null);
  }

  return (
    <>
      <div className="grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
        {selected && (
          <Card>
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold">
                  Solve #{selectedIndex}
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAlert('delete')}
                >
                  Delete
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">Scramble</span>
              <span className="font-medium">
                {inverseAlg(selected.alg.alg)}
              </span>
              <span className="text-xs text-muted-foreground">Time</span>
              <span className="text-xl font-medium tabular-nums">
                {formatTime(selected.time)}
              </span>
              <CubeImage alg={selected.alg.alg} size={160} />
            </CardContent>
          </Card>
        )}

        {sessionHistory.length > 0 && (
          <Card>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold">Times</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAlert('clear')}
                >
                  Clear
                </Button>
              </div>
              <div className="flex flex-wrap gap-4">
                <Stat title="Best" time={best} />
                <Stat title="Worst" time={worst} />
                <Stat title="Ao5" time={ao5} />
                <Stat title="Ao12" time={ao12} />
              </div>
              <div className="flex flex-wrap gap-1">
                {sessionHistory.map((h, i) => (
                  <Button
                    key={`${h.alg.name}-${i}`}
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedIndex(i)}
                    className={cn(
                      'tabular-nums',
                      i === selectedIndex &&
                        'bg-green-300 text-black hover:bg-green-300',
                    )}
                  >
                    {formatTime(h.time)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog
        open={alert !== null}
        onOpenChange={(o) => !o && setAlert(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
