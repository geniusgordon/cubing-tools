import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AppHeader } from '@/components/app-header';
import { CubeImage } from '@/components/cube-image';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useEventListener, useSettings, useLocalStorage } from '@/hooks';
import { generateCase, caseToString, randomChoice } from '@/lib/cube';
import { ColorNeutrality } from '@/data/types';
import type { AlgWithAuf, FlashCard, TestCase } from '@/data/types';

interface RecognitionTrainerProps {
  title: string;
  gamma?: number;
  flashCardName: string;
  defaultFlashCardMap: Record<string, FlashCard<AlgWithAuf>>;
  checkKeyInCases(case_: TestCase, key: string): boolean;
  checkIsCorrect(case_: TestCase, guess: string | null): boolean;
  renderAnswerOptions(props: {
    currentCase: TestCase;
    currentGuess: string | null;
    takeGuess(guess: string): void;
  }): ReactNode;
}

const CN_OPTIONS = [
  { value: ColorNeutrality.NON_CN, label: 'Non CN' },
  { value: ColorNeutrality.D_CN, label: 'Dual CN' },
  { value: ColorNeutrality.CN, label: 'CN' },
];

export function RecognitionTrainer({
  title,
  gamma = 0.5,
  flashCardName,
  defaultFlashCardMap,
  checkKeyInCases,
  checkIsCorrect,
  renderAnswerOptions,
}: RecognitionTrainerProps) {
  const [settings, updateSettings] = useSettings();

  const [flashCardMap, setFlashCardMap] = useLocalStorage<
    Record<string, FlashCard<AlgWithAuf>>
  >(flashCardName, defaultFlashCardMap);

  const cases = useMemo(
    () => Object.keys(defaultFlashCardMap),
    [defaultFlashCardMap],
  );

  const pickCaseFromFlashCards = useCallback(
    (cn: ColorNeutrality) => {
      const c = randomChoice(
        cases,
        cases.map(name => flashCardMap[name].deficiency),
      );
      const { data } = flashCardMap[c];
      return generateCase(data, { cn, preAuf: data.preAuf });
    },
    [cases, flashCardMap],
  );

  const [currentCase, setCurrentCase] = useState<TestCase>(() =>
    pickCaseFromFlashCards(settings.colorNeutrality),
  );
  const [currentGuess, setCurrentGuess] = useState<string | null>(null);

  const generateNextCase = useCallback(
    (cn: ColorNeutrality) => {
      setCurrentCase(pickCaseFromFlashCards(cn));
      setCurrentGuess(null);
    },
    [pickCaseFromFlashCards],
  );

  const takeGuess = useCallback(
    (guess: string) => {
      const flashCard = flashCardMap[currentCase.alg.name];
      if (!flashCard) {
        return;
      }
      setCurrentGuess(guess);
      const isCorrect = checkIsCorrect(currentCase, guess);
      const newDeficiency = isCorrect
        ? flashCard.deficiency * (1 - gamma)
        : flashCard.deficiency * (1 + gamma);
      setFlashCardMap({
        ...flashCardMap,
        [currentCase.alg.name]: { ...flashCard, deficiency: newDeficiency },
      });
    },
    [currentCase, flashCardMap, gamma, checkIsCorrect, setFlashCardMap],
  );

  const handleKeyup = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === ' ') {
        generateNextCase(settings.colorNeutrality);
        return;
      }
      if (checkKeyInCases(currentCase, e.key.toUpperCase())) {
        takeGuess(e.key.toUpperCase());
      }
    },
    [
      settings.colorNeutrality,
      currentCase,
      generateNextCase,
      takeGuess,
      checkKeyInCases,
    ],
  );

  useEventListener('keyup', handleKeyup);

  function handleCnChange(value: string) {
    updateSettings({ colorNeutrality: value as ColorNeutrality });
    generateNextCase(value as ColorNeutrality);
  }

  return (
    <>
      <AppHeader title={title} showBack />
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-6 p-6">
        <button
          type="button"
          className="cursor-pointer"
          onClick={() => generateNextCase(settings.colorNeutrality)}
          aria-label="Next case"
        >
          <CubeImage alg={caseToString(currentCase)} size={200} />
        </button>

        <div className="flex flex-col items-center gap-2">
          <Label>Color Neutrality</Label>
          <RadioGroup
            value={settings.colorNeutrality}
            onValueChange={handleCnChange}
            className="flex flex-row gap-4"
          >
            {CN_OPTIONS.map(o => (
              <div key={o.value} className="flex items-center gap-2">
                <RadioGroupItem value={o.value} id={`cn-${o.value}`} />
                <Label htmlFor={`cn-${o.value}`}>{o.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {renderAnswerOptions({ currentCase, currentGuess, takeGuess })}
      </main>
    </>
  );
}
