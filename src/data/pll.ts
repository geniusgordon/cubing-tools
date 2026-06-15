import type { Alg, AlgMap } from './types';

const pllMap: AlgMap = {
  // Ua: "(y2) M2 U M U2 M' U M2",
  // Ub: "(y2) M2 U' M U2 M' U' M2",
  Ab: "(x') R U' R D2 R' U R D2 R2 (x)",
  Aa: "(x) R' U R' D2 R U' R' D2 R2 (x')",
  // H: "M2' U M2' U2 M2' U M2",
  // Z: "(y) M' U M2' U M2' U M' U2 M2'",
  T: "R U R' U' R' F R2 U' R' U' R U R' F'",
  Y: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
  V: "R' U R' d' R' F' R2 U' R' U R' F R F",
  E: "(y x') (R U' R' D) (R U R' D') (R U R' D) (R U' R' D') (x)",
  F: "(y) R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R",
  Ja: "(y2) F U' R' F R2 U' R' U' R U R' F' R U R' F'",
  Jb: "R U R' F' R U R' U' R' F R2 U' R' U'",
  Ra: "(y') R U R' F' R U2 R' U2 R' F R U R U2 R' U'",
  Rb: "R' U2 R U2 R' F (R U R' U') R' F' R2' U'",
  Ga: "(y) R2 U (R' U R' U') R U' R2 (D U' R' U) R D'",
  Gc: "(y) R2' U' (R U' R U R') U R2 (D' U R U' R' D)",
  Gb: "R' U' R U D' R2 U R' U R U' R U' R2 D",
  Gd: "(y2) R U R' U' D R2 U' R U' R' U R' U R2 U D'",
  Na: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'",
  Nb: "R' U R U' R' F' U' F R U R' F R' F' R U' R",
};

const pllGroups = [
  // {
  //   name: 'Edge',
  //   cases: ['U', 'Z', 'H'],
  // },
  {
    name: 'Corner',
    cases: ['A', 'E'],
  },
  {
    name: 'Adjacent',
    cases: ['T', 'F', 'J', 'R'],
  },
  {
    name: 'Diagonal',
    cases: ['Y', 'V', 'N'],
  },
  {
    name: 'G',
    cases: ['G'],
  },
];

const pllAlgs: Alg[] = Object.keys(pllMap).map((key) => ({
  name: key,
  alg: pllMap[key],
}));

export default pllMap;
export { pllGroups, pllAlgs };
