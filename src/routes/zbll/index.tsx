import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks';
import { randomChoice, inverseAlg } from '@/lib/cube';
import { ollGroups, collGroups } from '@/data/coll';
import zbllMap from '@/data/zbll';
import type { Alg, FlashCard, History } from '@/data/types';
import { CaseSelector } from './case-selector';
import { Timer } from './timer';
import { SessionHistory } from './session-history';

type ZbllFlashCard = FlashCard<{ alg: Alg; count: number }>;

const defaultFlashCardMap: Record<string, ZbllFlashCard> = {};
ollGroups.forEach((oll) => {
  collGroups[oll].forEach((coll) => {
    Object.keys(zbllMap[oll][coll]).forEach((zbll) => {
      const name = `${oll}/${coll}/${zbll}`;
      defaultFlashCardMap[name] = {
        data: { alg: { name, alg: '' }, count: 0 },
        deficiency: 0,
      };
    });
  });
});

export default function ZbllTrainer() {
  const [caseSelectorOpen, setCaseSelectorOpen] = useState(false);

  const [selectedCases, setCases] = useLocalStorage<Record<string, boolean>>(
    'zbll-trainer/selected-cases',
    {},
  );
  const [flashCardMap, setFlashCardMap] = useLocalStorage<
    Record<string, ZbllFlashCard>
  >('zbll-trainer/flashcard-map', defaultFlashCardMap);
  const [sessionHistory, setSessionHistory] = useLocalStorage<History[]>(
    'zbll-trainer/session-history',
    [],
  );

  const [currentCase, setCurrentCase] = useState<Alg | null>(null);

  const cases = useMemo(
    () => Object.keys(selectedCases).filter((name) => selectedCases[name]),
    [selectedCases],
  );

  const pickCaseFromFlashCards = useCallback((): Alg | null => {
    if (cases.length === 0) return null;
    const probs = cases.map((c) =>
      flashCardMap[c].data.count === 0 ? 1000 : flashCardMap[c].deficiency,
    );
    const c = randomChoice(cases, probs);
    const flashCard = flashCardMap[c];
    if (!flashCard) return null;
    const [oll, coll, zbll] = flashCard.data.alg.name.split('/');
    const algs = zbllMap[oll][coll][zbll];
    const alg = randomChoice(
      algs,
      algs.map(() => 1),
    );
    return { name: flashCard.data.alg.name, alg };
  }, [cases, flashCardMap]);

  const generateNextCase = useCallback(() => {
    setCurrentCase(pickCaseFromFlashCards());
  }, [pickCaseFromFlashCards]);

  const handleTimerEnd = useCallback(
    (time: number) => {
      if (!currentCase) return;
      const flashCard = flashCardMap[currentCase.name];
      if (!flashCard) return;
      setSessionHistory([...sessionHistory, { alg: currentCase, time }]);
      const newDeficiency =
        (flashCard.deficiency * flashCard.data.count + time) /
        (flashCard.data.count + 1);
      setFlashCardMap({
        ...flashCardMap,
        [currentCase.name]: {
          data: { alg: flashCard.data.alg, count: flashCard.data.count + 1 },
          deficiency: newDeficiency,
        },
      });
      // No explicit generateNextCase() here: setFlashCardMap changes
      // pickCaseFromFlashCards' identity, which re-runs the effect below
      // and produces the next case (matches original behavior — avoids
      // double-generation).
    },
    [
      currentCase,
      flashCardMap,
      sessionHistory,
      setSessionHistory,
      setFlashCardMap,
    ],
  );

  function handleHistoryDelete(index: number) {
    if (index < 0 || index >= sessionHistory.length) return;
    const case_ = sessionHistory[index];
    const flashCard = flashCardMap[case_.alg.name];
    setSessionHistory([
      ...sessionHistory.slice(0, index),
      ...sessionHistory.slice(index + 1),
    ]);
    if (!flashCard) return;
    const newDeficiency =
      flashCard.data.count <= 1
        ? 0
        : (flashCard.deficiency * flashCard.data.count - case_.time) /
          (flashCard.data.count - 1);
    setFlashCardMap({
      ...flashCardMap,
      [case_.alg.name]: {
        data: { alg: flashCard.data.alg, count: flashCard.data.count - 1 },
        deficiency: newDeficiency,
      },
    });
  }

  function handleCaseSubmit(next: Record<string, boolean>) {
    setCases(next);
    setCaseSelectorOpen(false);
  }

  useEffect(() => {
    generateNextCase();
  }, [generateNextCase]);

  return (
    <>
      <AppHeader title="ZBLL Trainer" showBack />
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-4 p-6">
        <Button variant="outline" onClick={() => setCaseSelectorOpen(true)}>
          Select Cases
        </Button>
        <p className="text-sm text-muted-foreground">{cases.length} selected</p>
        <p className="min-h-9 text-center text-3xl font-medium">
          {currentCase ? inverseAlg(currentCase.alg) : ''}
        </p>
        <div className="py-8">
          <Timer onEnd={handleTimerEnd} />
        </div>
        <SessionHistory
          sessionHistory={sessionHistory}
          onDelete={handleHistoryDelete}
          onClear={() => setSessionHistory([])}
        />
      </main>
      <CaseSelector
        open={caseSelectorOpen}
        selectedCases={selectedCases}
        onClose={() => setCaseSelectorOpen(false)}
        onSubmit={handleCaseSubmit}
      />
    </>
  );
}
