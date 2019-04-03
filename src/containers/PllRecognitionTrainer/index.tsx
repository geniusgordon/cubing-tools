import React from 'react';
import classNames from 'classnames';
import { createStyles, withStyles, WithStyles } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import { red, green } from '@material-ui/core/colors';
import CubeImage from '../../components/CubeImage';
import { generateCase } from '../../utils';
import { Alg, pll, pllGroups } from '../../data/algs';

const styles = createStyles({
  container: {
    marginTop: 30,
  },
  cubeImage: {
    cursor: 'pointer',
  },
  buttonRow: {
    marginTop: 20,
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

interface History {
  case_: Alg;
  guess: string;
}

interface Props extends WithStyles<typeof styles> {}

function PllRecognitionTrainer({ classes }: Props) {
  const [currentCase, setCurrentCase] = React.useState<Alg | null>(null);
  const [currentGuess, setCurrentGuess] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<History[]>([]);

  function nextCase() {
    const n = Math.floor(Math.random() * pll.length);
    const case_ = generateCase(pll[n]);
    setCurrentCase(case_);
    setCurrentGuess(null);
  }

  function takeGuess(guess: string) {
    if (currentCase) {
      setCurrentGuess(guess);
      setHistory([
        {
          case_: currentCase,
          guess,
        },
        ...history,
      ]);
    }
  }

  React.useEffect(() => {
    nextCase();
  }, []);

  return (
    <div className={classes.container}>
      <Grid container justify="center">
        {currentCase && (
          <div className={classes.cubeImage} onClick={nextCase}>
            <CubeImage alg={currentCase.alg} />
          </div>
        )}
      </Grid>
      {pllGroups.map(group => (
        <Grid
          key={group.name}
          container
          justify="center"
          className={classes.buttonRow}
        >
          {group.cases.map(c => {
            const currentCaseName = currentCase ? currentCase.name[0] : '';
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
      ))}
    </div>
  );
}

export default withStyles(styles)(PllRecognitionTrainer);
