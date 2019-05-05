import React from 'react';
import classNames from 'classnames';
import { createStyles, withStyles, WithStyles } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import { red, green } from '@material-ui/core/colors';
import useLocalStorage from '../../hooks/useLocalStorage';
import { pll, pllGroups } from '../../data/algs';
import { FlashCard, Alg } from '../../data/types';
import RecognitionTrainer from './RecognitionTrainer';

const styles = createStyles({
  buttonRow: {
    marginTop: 10,
  },
  correct: {
    color: 'white',
    backgroundColor: green[500],
    '&:hover': {
      backgroundColor: green[500],
    },
  },
  wrong: {
    color: 'white',
    backgroundColor: red[500],
    '&:hover': {
      backgroundColor: red[500],
    },
  },
});

interface Props extends WithStyles<typeof styles> {}

function PllRecognitionTrainer({ classes }: Props) {
  const [pllFlashCards, setPllFashCards] = useLocalStorage<FlashCard<Alg>[]>(
    'pll-recognition',
    pll.map(p => ({ case: p, deficiency: 1 })),
  );

  function checkKeyInCases(key: string): boolean {
    if (/[a-zA-Z]/.test(key)) {
      return pllGroups.some(group => group.cases.includes(key));
    }
    return false;
  }

  return (
    <RecognitionTrainer
      title="Pll Recognition Trainer"
      flashCards={pllFlashCards}
      checkKeyInCases={checkKeyInCases}
      renderAnswerOptions={({ currentCase, currentGuess, takeGuess }) =>
        pllGroups.map(group => (
          <Grid
            key={group.name}
            container
            justify="center"
            className={classes.buttonRow}
          >
            {group.cases.map(c => {
              const currentCaseName = currentCase
                ? currentCase.alg.name[0]
                : '';
              const isCorrect =
                currentGuess === c && currentCaseName === currentGuess;
              const isWrong =
                currentGuess === c && currentCaseName !== currentGuess;

              return (
                <Button
                  key={c}
                  variant="contained"
                  className={classNames({
                    [classes.correct]: isCorrect,
                    [classes.wrong]: isWrong,
                  })}
                  onClick={() => takeGuess(c)}
                >
                  {c}
                </Button>
              );
            })}
          </Grid>
        ))
      }
    />
  );
}

export default withStyles(styles)(PllRecognitionTrainer);
