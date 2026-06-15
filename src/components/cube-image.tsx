import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { toQueryString } from '@/lib/cube';

interface CubeImageProps {
  size?: number;
  alg: string;
  view?: 'plan' | 'trans';
  stage?: string;
}

export function CubeImage({ size = 200, alg, view, stage }: CubeImageProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
  }, [alg]);

  const queryString = toQueryString({
    fmt: 'svg',
    bg: 't',
    case: alg,
    view,
    stage,
    size,
  });

  return (
    <div className="relative" style={{ height: size, width: size }}>
      {loading && <Skeleton className="absolute inset-0 rounded-md" />}
      <img
        src={`https://cube.crider.co.uk/visualcube.php?${queryString}`}
        alt=""
        onLoad={() => setLoading(false)}
        style={{ height: size, width: size }}
        className={cn('transition-opacity', loading && 'opacity-0')}
      />
    </div>
  );
}
