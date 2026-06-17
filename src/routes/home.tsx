import { Link } from 'react-router';
import { AppHeader } from '@/components/app-header';
import { CubeImage } from '@/components/cube-image';
import { Card, CardContent } from '@/components/ui/card';

const TRAINERS = [
  {
    title: 'PLL Recognition Trainer',
    to: '/trainers/recognition/pll',
    alg: '',
    view: undefined as 'plan' | undefined,
    stage: 'll',
  },
  {
    title: 'COLL Recognition Trainer',
    to: '/trainers/recognition/coll',
    alg: '',
    view: 'plan' as const,
    stage: 'coll',
  },
  {
    title: 'Cross Trainer',
    to: '/trainers/cross',
    alg: '',
    view: undefined as 'plan' | undefined,
    stage: 'cross-x2',
  },
  {
    title: 'ZBLL Trainer',
    to: '/trainers/zbll',
    alg: "(R U R' U') (R U' R U2 R2) (U' R U R' U') (R2 U' R2 U')",
    view: 'plan' as const,
    stage: 'll',
  },
  {
    title: 'OLL Trainer',
    to: '/trainers/oll',
    alg: "R U R' U R U2 R'",
    view: 'plan' as const,
    stage: 'oll',
  },
];

export default function Home() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto grid max-w-2xl grid-cols-1 gap-6 p-6 sm:grid-cols-2">
        {TRAINERS.map((t) => (
          <Link key={t.to} to={t.to} className="no-underline">
            <Card className="transition-colors hover:bg-accent">
              <CardContent className="flex flex-col items-center gap-4 p-6">
                <CubeImage
                  alg={t.alg}
                  view={t.view}
                  stage={t.stage}
                  size={128}
                />
                <h2 className="text-center text-lg font-medium">{t.title}</h2>
              </CardContent>
            </Card>
          </Link>
        ))}
      </main>
    </>
  );
}
