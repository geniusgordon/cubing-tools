import { useCallback, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { CubeImage } from '@/components/cube-image';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { useDeficiencyDeck, useEventListener } from '@/hooks';
import { generateCase, caseToString } from '@/lib/cube';
import { ColorNeutrality, type FlashCard, type TestCase } from '@/data/types';
import { ollCases, ollCategories, type OllCase } from '@/data/oll';

const ALL = 'All';

// One deck entry per OLL case, keyed by its number (as string).
const defaultDeck: Record<string, FlashCard<OllCase>> = {};
ollCases.forEach((c) => {
  defaultDeck[String(c.number)] = { data: c, deficiency: 1 };
});

function namesForCategory(category: string): string[] {
  return ollCases
    .filter((c) => category === ALL || c.category === category)
    .map((c) => String(c.number));
}

export default function OllTrainer() {
  const deck = useDeficiencyDeck('oll-trainer', defaultDeck);
  const [category, setCategory] = useState<string>(ALL);
  const [revealed, setRevealed] = useState(false);

  const nextCase = useCallback((): { case_: TestCase; data: OllCase } => {
    const { data } = deck.pick(namesForCategory(category));
    // OLL recognition is color/orientation-based: force non-CN, random AUF.
    const case_ = generateCase(
      { name: data.name, alg: data.alg },
      { cn: ColorNeutrality.NON_CN },
    );
    return { case_, data };
  }, [deck, category]);

  const [current, setCurrent] = useState(() => nextCase());

  const advance = useCallback(() => {
    setCurrent(nextCase());
    setRevealed(false);
  }, [nextCase]);

  const grade = useCallback(
    (correct: boolean) => {
      deck.record(String(current.data.number), correct);
      advance();
    },
    [deck, current, advance],
  );

  const handleKeyup = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === ' ') {
        if (revealed) advance();
        else setRevealed(true);
        return;
      }
      if (!revealed) return;
      if (e.key === '1' || e.key.toLowerCase() === 'f') grade(false);
      if (e.key === '2' || e.key.toLowerCase() === 'j') grade(true);
    },
    [revealed, advance, grade],
  );

  useEventListener('keyup', handleKeyup);

  function handleCategoryChange(value: string) {
    setCategory(value);
    setRevealed(false);
    setCurrent(() => {
      const { data } = deck.pick(namesForCategory(value));
      const case_ = generateCase(
        { name: data.name, alg: data.alg },
        { cn: ColorNeutrality.NON_CN },
      );
      return { case_, data };
    });
  }

  return (
    <>
      <AppHeader title="OLL Trainer" showBack />
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-6 p-6">
        <div className="flex flex-col items-center gap-2">
          <Label htmlFor="oll-category">Category</Label>
          <NativeSelect
            id="oll-category"
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            <NativeSelectOption value={ALL}>All ({ollCases.length})</NativeSelectOption>
            {ollCategories.map((cat) => (
              <NativeSelectOption key={cat} value={cat}>
                {cat} ({namesForCategory(cat).length})
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <button
          type="button"
          className="cursor-pointer"
          onClick={() => (revealed ? advance() : setRevealed(true))}
          aria-label={revealed ? 'Next case' : 'Reveal answer'}
        >
          <CubeImage alg={caseToString(current.case_)} stage="oll" view="plan" size={200} />
        </button>

        {revealed ? (
          <div className="flex flex-col items-center gap-3">
            <div className="text-center">
              <div className="text-lg font-medium">
                OLL {current.data.number} — {current.data.name}
              </div>
              <div className="font-mono text-sm text-muted-foreground">
                {current.data.alg}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => grade(false)}>
                ✗ Missed (1/F)
              </Button>
              <Button onClick={() => grade(true)}>✓ Got it (2/J)</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Press Space or click the cube to reveal
          </p>
        )}
      </main>
    </>
  );
}
