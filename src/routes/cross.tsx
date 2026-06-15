import { useCallback, useEffect, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettings } from '@/hooks';
import { generateCrossScramble } from '@/lib/cube';
import type { Scramble } from '@/data/types';

export default function CrossTrainer() {
  const [currentScramble, setScramble] = useState<Scramble | null>(null);
  const [settings, updateSettings] = useSettings();

  const nextScramble = useCallback(() => {
    setScramble(generateCrossScramble(settings.crossLevel));
  }, [settings.crossLevel]);

  useEffect(() => {
    function handleKeyup(e: KeyboardEvent) {
      if (e.key === ' ') {
        nextScramble();
      }
    }
    document.addEventListener('keyup', handleKeyup);
    return () => document.removeEventListener('keyup', handleKeyup);
  }, [nextScramble]);

  useEffect(() => {
    nextScramble();
  }, [nextScramble]);

  return (
    <>
      <AppHeader title="Cross Trainer" showBack />
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-6 p-6">
        <div className="flex flex-col items-center gap-2">
          <Label htmlFor="level">Level</Label>
          <Select
            value={String(settings.crossLevel)}
            onValueChange={(v) => updateSettings({ crossLevel: Number(v) })}
          >
            <SelectTrigger id="level" className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...Array(8)].map((_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={nextScramble}>Next Scramble</Button>

        <Card className="w-full">
          <CardContent className="p-8 text-center text-2xl font-medium">
            {currentScramble ? currentScramble.join(' ') : ''}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
