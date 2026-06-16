export interface OllCase {
  number: number; // 1..57, standard OLL numbering
  name: string;
  alg: string; // applied to a solved cube via applyCase() -> this OLL state
  category: OllCategory;
}

export type OllCategory =
  | 'Dot'
  | 'Square'
  | 'Lightning'
  | 'Fish'
  | 'Knight'
  | 'OCLL'
  | 'Awkward'
  | 'P'
  | 'T'
  | 'C'
  | 'W'
  | 'L'
  | 'Line'
  | 'Special';

export const ollCategories: OllCategory[] = [
  'Dot', 'Square', 'Lightning', 'Fish', 'Knight', 'OCLL',
  'Awkward', 'P', 'T', 'C', 'W', 'L', 'Line', 'Special',
];

export const ollCases: OllCase[] = [
  { number: 1, name: 'Dot 1', category: 'Dot', alg: "R U2 R2 F R F' U2 R' F R F'" },
  { number: 2, name: 'Dot 2', category: 'Dot', alg: "F R U R' U' F' f R U R' U' f'" },
  { number: 3, name: 'Dot 3', category: 'Dot', alg: "f R U R' U' f' U' F R U R' U' F'" },
  { number: 4, name: 'Dot 4', category: 'Dot', alg: "f R U R' U' f' U F R U R' U' F'" },
  { number: 5, name: 'Square 5', category: 'Square', alg: "r' U2 R U R' U r" },
  { number: 6, name: 'Square 6', category: 'Square', alg: "r U2 R' U' R U' r'" },
  { number: 7, name: 'Lightning 7', category: 'Lightning', alg: "r U R' U R U2 r'" },
  { number: 8, name: 'Lightning 8', category: 'Lightning', alg: "r' U' R U' R' U2 r" },
  { number: 9, name: 'Fish 9', category: 'Fish', alg: "R U R' U' R' F R2 U R' U' F'" },
  { number: 10, name: 'Fish 10', category: 'Fish', alg: "R U R' U R' F R F' R U2 R'" },
  { number: 11, name: 'Lightning 11', category: 'Lightning', alg: "r U R' U R' F R F' R U2 r'" },
  { number: 12, name: 'Lightning 12', category: 'Lightning', alg: "M' R' U' R U' R' U2 R U' M" },
  { number: 13, name: 'Knight 13', category: 'Knight', alg: "F U R U' R2 F' R U R U' R'" },
  { number: 14, name: 'Knight 14', category: 'Knight', alg: "R' F R U R' F' R F U' F'" },
  { number: 15, name: 'Knight 15', category: 'Knight', alg: "r' U' r R' U' R U r' U r" },
  { number: 16, name: 'Knight 16', category: 'Knight', alg: "r U r' R U R' U' r U' r'" },
  { number: 17, name: 'Dot 17', category: 'Dot', alg: "R U R' U R' F R F' U2 R' F R F'" },
  { number: 18, name: 'Dot 18', category: 'Dot', alg: "r U R' U R U2 r' r' U' R U' R' U2 r" },
  { number: 19, name: 'Dot 19', category: 'Dot', alg: "M U R U R' U' M' R' F R F'" },
  { number: 20, name: 'Dot 20', category: 'Dot', alg: "r U R' U' M2 U R U' R' U' M'" },
  { number: 21, name: 'Double Sune', category: 'OCLL', alg: "R U2 R' U' R U R' U' R U' R'" },
  { number: 22, name: 'Pi', category: 'OCLL', alg: "R U2 R2 U' R2 U' R2 U2 R" },
  { number: 23, name: 'Headlights', category: 'OCLL', alg: "R2 D R' U2 R D' R' U2 R'" },
  { number: 24, name: 'Chameleon', category: 'OCLL', alg: "r U R' U' r' F R F'" },
  { number: 25, name: 'Bowtie', category: 'OCLL', alg: "F' r U R' U' r' F R" },
  { number: 26, name: 'Anti-Sune', category: 'OCLL', alg: "R U2 R' U' R U' R'" },
  { number: 27, name: 'Sune', category: 'OCLL', alg: "R U R' U R U2 R'" },
  { number: 28, name: 'Special 28', category: 'Special', alg: "r U R' U' M U R U' R'" },
  { number: 29, name: 'Awkward 29', category: 'Awkward', alg: "R U R' U' R U' R' F' U' F R U R'" },
  { number: 30, name: 'Awkward 30', category: 'Awkward', alg: "F R' F R2 U' R' U' R U R' F2" },
  { number: 31, name: 'P 31', category: 'P', alg: "R' U' F U R U' R' F' R" },
  { number: 32, name: 'P 32', category: 'P', alg: "R U B' U' R' U R B R'" },
  { number: 33, name: 'T 33', category: 'T', alg: "R U R' U' R' F R F'" },
  { number: 34, name: 'C 34', category: 'C', alg: "R U R' U' B' R' F R F' B" },
  { number: 35, name: 'Fish 35', category: 'Fish', alg: "R U2 R2 F R F' R U2 R'" },
  { number: 36, name: 'W 36', category: 'W', alg: "L' U' L U' L' U L U L F' L' F" },
  { number: 37, name: 'Fish 37', category: 'Fish', alg: "F R' F' R U R U' R'" },
  { number: 38, name: 'W 38', category: 'W', alg: "R U R' U R U' R' U' R' F R F'" },
  { number: 39, name: 'Lightning 39', category: 'Lightning', alg: "L F' L' U' L U F U' L'" },
  { number: 40, name: 'Lightning 40', category: 'Lightning', alg: "R' F R U R' U' F' U R" },
  { number: 41, name: 'Awkward 41', category: 'Awkward', alg: "R U R' U R U2 R' F R U R' U' F'" },
  { number: 42, name: 'Awkward 42', category: 'Awkward', alg: "R' U' R U' R' U2 R F R U R' U' F'" },
  { number: 43, name: 'P 43', category: 'P', alg: "R' U' F' U F R" },
  { number: 44, name: 'P 44', category: 'P', alg: "F U R U' R' F'" },
  { number: 45, name: 'T 45', category: 'T', alg: "F R U R' U' F'" },
  { number: 46, name: 'C 46', category: 'C', alg: "R' U' R' F R F' U R" },
  { number: 47, name: 'L 47', category: 'L', alg: "R' U' R' F R F' R' F R F' U R" },
  { number: 48, name: 'L 48', category: 'L', alg: "F R U R' U' R U R' U' F'" },
  { number: 49, name: 'L 49', category: 'L', alg: "R B' R2 F R2 B R2 F' R" },
  { number: 50, name: 'L 50', category: 'L', alg: "R' F R2 B' R2 F' R2 B R'" },
  { number: 51, name: 'Line 51', category: 'Line', alg: "F U R U' R' U R U' R' F'" },
  { number: 52, name: 'Line 52', category: 'Line', alg: "R U R' U R d' R U' R' F'" },
  { number: 53, name: 'L 53', category: 'L', alg: "r' U2 R U R' U' R U R' U r" },
  { number: 54, name: 'L 54', category: 'L', alg: "r U2 R' U' R U R' U' R U' r'" },
  { number: 55, name: 'Line 55', category: 'Line', alg: "R U2 R2 U' R U' R' U2 F R F'" },
  { number: 56, name: 'Line 56', category: 'Line', alg: "r' U' r U' R' U R U' R' U R r' U r" },
  { number: 57, name: 'Special 57', category: 'Special', alg: "R U R' U' M' U r U' r'" },
];
