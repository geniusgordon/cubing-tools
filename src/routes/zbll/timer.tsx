import { cn } from '@/lib/utils';
import { useTimer, TimerStatus } from '@/hooks';
import { formatTime } from '@/lib/cube';

interface TimerProps {
  onEnd(time: number): void;
}

const STATUS_COLOR: Record<TimerStatus, string> = {
  [TimerStatus.STOPPED]: 'text-foreground',
  [TimerStatus.READY]: 'text-green-600',
  [TimerStatus.RUNNING]: 'text-foreground',
};

export function Timer({ onEnd }: TimerProps) {
  const { time, status } = useTimer({ onEnd });
  return (
    <div
      className={cn('font-mono text-6xl tabular-nums', STATUS_COLOR[status])}
    >
      {formatTime(time)}
    </div>
  );
}
