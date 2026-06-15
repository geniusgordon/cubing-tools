import type { Alg, AlgMap } from './types';

interface CollMap {
  [group: string]: AlgMap;
}

interface CollGroups {
  [name: string]: string[];
}

const collMap: CollMap = {
  U: {
    BBFF: "R' (F R U' R' U' R U R' F') (R U R' U' R' F R F') R",
    BFFB: "F (R U' R' U) (R U R' U) (R U' R' F')",
    FFLR: "(R' U2 R) F (U' R' U' R) U F'",
    FRLF: "R2 D' (R U2' R') D (R U2' R)",
    LFFR: "y2 R2 D (R' U2' R) D' (R' U2' R')",
    LRFF: "y2 (R U R' U R U2' R2') (U' R U' R' U2 R)",
  },
  T: {
    BBFF: "(R U2' R' U' R U' R2') (U2' R U R' U R)",
    FBFB: "y2 (R U' R2' D') (r U2' r') (D R2 U R')",
    FFLR: "y2 F (R U R' U') (R U' R' U') (R U R' F')",
    FLFR: "y' (r U R' U') (L' U R U') x'",
    RFLF: "y' (r' U' R U) (L U' R' U) x",
    RLFF: "(R' U R) U2' L' (R' U R U') L",
  },
  L: {
    LRFF: "R U2' R' (U' R U R') (U' R U R') (U' R U' R')",
    FBRL: "y R U2' (L' U L) U2' R' (L' U L)",
    LFFB: "y2 (R U2' R D) (R' U2 R D') R2",
    LFFR: "y (R' U2' R' D') (R U2' R' D) R2",
    RFBL: "y2 L' (R U R' U') L (U R U' R')",
    LBFF: "y x' (U' R U L') (U' R' U r)",
  },
  H: {
    BBFF: "(R U R' U) (R U' R' U) R U2' R'",
    FBFB: "y F (R U R' U') (R U R' U') (R U R' U') F'",
    RLFF: "F (R U' R' U) (R U2' R' U') (R U R' U') F'",
    RFLF: "(R U R' U) (R U L' U) R' U' L",
  },
  Pi: {
    LFRF: "R U2' R2 U' R2 U' R2 U2' R",
    FRFL: "(R U' R' U2') (L' U R U') L R' U2' R U R'",
    FRLF: "y (L' U R U' L U R') (R' U' R U' R' U2' R)",
    RFFL: "y' (R' U2' R U R' U R) (R U' L' U R' U' L)",
    FBFB: "y2 (L' U R U') L U' R' (U' R U' R')",
    BFFB: "y F (U R U' R') (U R U2' R') (U' R U R') F'",
  },
};

const collGroups: CollGroups = {
  U: Object.keys(collMap.U),
  T: Object.keys(collMap.T),
  L: Object.keys(collMap.L),
  H: Object.keys(collMap.H),
  Pi: Object.keys(collMap.Pi),
};

const ollGroups = ['H', 'Pi', 'U', 'T', 'L'];

const collAlgs: Alg[] = Object.keys(collMap)
  .map(group =>
    collGroups[group].map(name => ({
      name: `${group}/${name}`,
      alg: collMap[group][name],
    })),
  )
  .flat();

const ollAlgs = ollGroups.map(group => ({
  name: group,
  alg: collMap[group][collGroups[group][0]],
}));

export default collMap;
export { collGroups, collAlgs, ollGroups, ollAlgs };
