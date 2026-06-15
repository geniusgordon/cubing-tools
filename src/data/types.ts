export interface Alg {
  name: string;
  alg: string;
}

export interface AlgWithAuf extends Alg {
  preAuf: number;
}

export interface AlgMap {
  [name: string]: string;
}

export interface TestCase {
  alg: Alg;
  preAuf: number;
  postAuf: number;
  cnRotation: number;
  yRotation: number;
}

export interface FlashCard<T> {
  data: T;
  deficiency: number;
}

export enum ColorNeutrality {
  CN = 'CN',
  D_CN = 'D_CN',
  NON_CN = 'NON_CN',
}

export type Scramble = string[];

export interface History {
  alg: Alg;
  time: number;
}
