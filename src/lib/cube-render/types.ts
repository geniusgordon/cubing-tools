export type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
export const FACES: Face[] = ['U', 'R', 'F', 'D', 'L', 'B'];

export type Vec3 = readonly [number, number, number];

/** 54 facelet labels, faces in FACES order, each row-major r=0..2,c=0..2. */
export type Facelets = Face[];

export interface Slot {
  face: Face;
  index: number; // 0..53 global index
  pos: Vec3; // cubie center
  normal: Vec3; // outward face direction
}
