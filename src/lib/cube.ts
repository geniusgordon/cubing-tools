import type { Alg, Scramble, TestCase } from '@/data/types';
import { ColorNeutrality } from '@/data/types';
import crossScrambles from '@/data/cross';

function numToAuf(n: number): string {
  const auf = ['', 'U', 'U2', "U'"];
  return auf[n];
}

function numToYRotation(n: number): string {
  const r = ['', 'y', 'y2', "y'"];
  return r[n];
}

function numToCnRotation(n: number): string {
  const rotations = ['', 'x', 'x2', "x'", 'z', "z'"];
  return rotations[n];
}

function generateAuf(): number {
  return Math.floor(Math.random() * 4);
}

function generateYRotation(): number {
  return Math.floor(Math.random() * 4);
}

function generateCnRotation(cn: ColorNeutrality): number {
  switch (cn) {
    case ColorNeutrality.CN:
      return Math.floor(Math.random() * 6);
    case ColorNeutrality.D_CN:
      return Math.floor(Math.random() * 2) * 2;
    case ColorNeutrality.NON_CN:
    default:
      return 0;
  }
}

interface GenerateCaseOptions {
  cn: ColorNeutrality;
  preAuf?: number;
}

export function generateCase(alg: Alg, options: GenerateCaseOptions): TestCase {
  const preAuf =
    typeof options.preAuf === 'undefined' ? generateAuf() : options.preAuf;
  const postAuf = generateAuf();
  const yRotation = generateYRotation();
  const cnRotation = generateCnRotation(options.cn);
  return { alg, preAuf, postAuf, yRotation, cnRotation };
}

export function caseToString(c: TestCase): string {
  return (
    numToAuf(c.preAuf) +
    c.alg.alg +
    numToAuf(c.postAuf) +
    numToYRotation(c.yRotation) +
    numToCnRotation(c.cnRotation)
  );
}

export function toQueryString(params: Record<string, unknown>): string {
  return Object.keys(params)
    .filter((key) => typeof params[key] !== 'undefined')
    .map((key) => key + '=' + params[key])
    .join('&');
}

export function generateCrossScramble(level: number): Scramble | null {
  if (level < 1 || level >= 8) {
    return null;
  }
  const moveNames = [
    'R',
    'R2',
    "R'",
    'F',
    'F2',
    "F'",
    'L',
    'L2',
    "L'",
    'B',
    'B2',
    "B'",
    'U',
    'U2',
    "U'",
    'D',
    'D2',
    "D'",
  ];
  const randomScramble =
    crossScrambles[level - 1][Math.floor(Math.random() * 1000)];
  return randomScramble
    .split('')
    .map((s) => moveNames[s.charCodeAt(0) - 'A'.charCodeAt(0)]);
}

export function randomChoice<T>(choices: T[], probs: number[]): T {
  const total = probs.reduce((acc, value) => acc + value, 0);
  const r = Math.random() * total;
  let upto = 0;
  for (let i = 0; i < probs.length; i++) {
    if (upto + probs[i] >= r) {
      return choices[i];
    }
    upto += probs[i];
  }
  return choices[choices.length - 1];
}

export function inverseAlg(alg: string): string {
  const tokens: string[] = [];
  const chars = alg.replace(/[()]/g, '').split('');
  let i = 0;
  while (i < chars.length) {
    if (/[a-zA-Z]/.test(chars[i])) {
      if (chars[i + 1] === '2') {
        tokens.push(chars[i] + chars[i + 1]);
        i += 2;
      } else if (chars[i + 1] === "'") {
        tokens.push(chars[i]);
        i += 2;
      } else {
        tokens.push(chars[i] + "'");
        i++;
      }
    } else {
      i++;
    }
  }
  return tokens.reverse().join(' ');
}

function padZero(n: number): string {
  if (n < 10) {
    return `0${n}`;
  }
  return n.toString();
}

export function formatTime(time: number): string {
  return `${Math.floor(time / 100)}.${padZero(Math.floor(time % 100))}`;
}

export function averageOfN(arr: number[], n: number): number | null {
  if (arr.length < n) {
    return null;
  }
  return arr.slice(arr.length - n).reduce((val, acc) => val + acc, 0) / n;
}
