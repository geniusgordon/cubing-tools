import { collGroups, collAlgs } from '@/data/coll';
import type { AlgWithAuf, FlashCard, TestCase } from '@/data/types';
import { RecognitionTrainer } from '../recognition-trainer';
import { CollAnswerOptions } from './coll-answer-options';

const defaultFlashCardMap: Record<string, FlashCard<AlgWithAuf>> = {};
collAlgs.forEach((alg) =>
  [...new Array(4)].forEach((_, i) => {
    const name = `${alg.name}-${i}`;
    defaultFlashCardMap[name] = {
      data: { name, alg: alg.alg, preAuf: i },
      deficiency: 1,
    };
  }),
);

function checkKeyInCases(case_: TestCase, key: string): boolean {
  const group = case_.alg.name.split('/')[0];
  if (collGroups[group].length === 4) {
    return /[1-4]/.test(key);
  }
  return /[1-6]/.test(key);
}

function checkIsCorrect(case_: TestCase, guess: string | null): boolean {
  if (!guess) {
    return false;
  }
  const group = case_.alg.name.split('/')[0];
  const options = collGroups[group].map((name) => `${group}/${name}`);
  // case_.alg.name carries an AUF suffix (e.g. "U/BBFF-0"); the option names
  // don't ("U/BBFF"). Strip the trailing "-<auf>" so the comparison can match.
  const caseName = case_.alg.name.replace(/-\d+$/, '');
  return options[parseInt(guess) - 1] === caseName;
}

export default function CollRecognitionTrainer() {
  return (
    <RecognitionTrainer
      title="COLL Recognition Trainer"
      flashCardName="coll-recognition"
      defaultFlashCardMap={defaultFlashCardMap}
      checkKeyInCases={checkKeyInCases}
      checkIsCorrect={checkIsCorrect}
      renderAnswerOptions={({ currentCase, currentGuess, takeGuess }) => (
        <CollAnswerOptions
          currentCase={currentCase}
          currentGuess={currentGuess}
          checkIsCorrect={checkIsCorrect}
          takeGuess={takeGuess}
        />
      )}
    />
  );
}
