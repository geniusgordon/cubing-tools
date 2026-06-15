import { Link } from 'react-router';
import { AppHeader } from '@/components/app-header';
import { Card, CardContent } from '@/components/ui/card';

const TRAINERS = [
  {
    title: 'PLL Recognition Trainer',
    image:
      'https://cube.crider.co.uk/visualcube.php?fmt=svg&size=200&stage=ll',
    to: '/trainers/recognition/pll',
  },
  {
    title: 'COLL Recognition Trainer',
    image:
      'https://cube.crider.co.uk/visualcube.php?fmt=svg&size=200&stage=coll',
    to: '/trainers/recognition/coll',
  },
  {
    title: 'Cross Trainer',
    image:
      'https://cube.crider.co.uk/visualcube.php?fmt=svg&size=200&stage=cross-x2',
    to: '/trainers/cross',
  },
  {
    title: 'ZBLL Trainer',
    image:
      "https://cube.crider.co.uk/visualcube.php?fmt=svg&size=200&stage=ll&case=(RUR'U')(RU'RU2R2)(U'RUR'U')(R2U'R2U')",
    to: '/trainers/zbll',
  },
];

export default function Home() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto grid max-w-2xl grid-cols-1 gap-6 p-6 sm:grid-cols-2">
        {TRAINERS.map(t => (
          <Link key={t.to} to={t.to} className="no-underline">
            <Card className="transition-colors hover:bg-accent">
              <CardContent className="flex flex-col items-center gap-4 p-6">
                <img src={t.image} alt="" className="h-32 w-32" />
                <h2 className="text-center text-lg font-medium">{t.title}</h2>
              </CardContent>
            </Card>
          </Link>
        ))}
      </main>
    </>
  );
}
