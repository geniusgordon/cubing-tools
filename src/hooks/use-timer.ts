import React from 'react';
import useEventListener from './use-event-listener';
import useInterval from './use-interval';

export enum TimerStatus {
  STOPPED = 'STOPPED',
  READY = 'READY',
  RUNNING = 'RUNNING',
}

interface Args {
  onHold?: () => void;
  onStart?: () => void;
  onEnd?: (time: number) => void;
}

function useTimer({
  onHold,
  onStart,
  onEnd,
}: Args): { time: number; status: TimerStatus } {
  const [time, setTime] = React.useState<number>(0);
  const [status, setStatus] = React.useState<TimerStatus>(TimerStatus.STOPPED);
  const holding = React.useRef<boolean>(false);

  const handleInterval = React.useCallback(() => {
    if (status === TimerStatus.RUNNING) {
      setTime(t => t + 1);
    }
  }, [status]);

  const handleKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      if (holding.current) {
        return;
      }
      holding.current = true;
      if (status === TimerStatus.STOPPED) {
        if (e.key === ' ') {
          setTime(0);
          setStatus(TimerStatus.READY);
          if (onHold) {
            onHold();
          }
        }
      } else if (status === TimerStatus.RUNNING) {
        setStatus(TimerStatus.STOPPED);
        if (onEnd) {
          onEnd(time);
        }
      }
    },
    [time, status, onHold, onEnd],
  );

  const handleKeyUp = React.useCallback(
    (e: KeyboardEvent) => {
      holding.current = false;
      if (status === TimerStatus.READY) {
        if (e.key === ' ') {
          setStatus(TimerStatus.RUNNING);
          if (onStart) {
            onStart();
          }
        }
      }
    },
    [status, onStart],
  );

  useInterval(handleInterval, 10);
  useEventListener('keydown', handleKeyDown);
  useEventListener('keyup', handleKeyUp);

  return { time, status };
}

export default useTimer;
