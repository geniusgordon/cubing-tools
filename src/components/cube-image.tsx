import { useMemo } from 'react';
import {
  applyCase,
  maskedColors,
  planLayout,
  PLAN_VIEWBOX,
  cube3dLayout,
  CUBE3D_VIEWBOX,
} from '@/lib/cube-render';

interface CubeImageProps {
  size?: number;
  alg: string;
  view?: 'plan' | 'trans';
  stage?: string;
}

export function CubeImage({ size = 200, alg, view, stage }: CubeImageProps) {
  const svg = useMemo(() => {
    const colors = maskedColors(applyCase(alg), stage);
    if (view === 'plan') {
      return { viewBox: PLAN_VIEWBOX, kind: 'plan' as const, cells: planLayout(colors) };
    }
    return { viewBox: CUBE3D_VIEWBOX, kind: '3d' as const, quads: cube3dLayout(colors) };
  }, [alg, view, stage]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${svg.viewBox} ${svg.viewBox}`}
      role="img"
      aria-label="cube"
    >
      {svg.kind === 'plan'
        ? svg.cells.map((c, i) => (
            <rect
              key={i}
              x={c.x}
              y={c.y}
              width={c.w}
              height={c.h}
              rx={1}
              fill={c.fill}
              stroke="#222"
              strokeWidth={0.6}
            />
          ))
        : svg.quads.map((q, i) => (
            <polygon
              key={i}
              points={q.points.map(([x, y]) => `${x},${y}`).join(' ')}
              fill={q.fill}
              stroke="#222"
              strokeWidth={0.6}
              strokeLinejoin="round"
            />
          ))}
    </svg>
  );
}
