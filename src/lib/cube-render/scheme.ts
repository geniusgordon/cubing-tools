import type { Face } from './types';

/** CFOP last-layer convention; hexes chosen to resemble the old diagrams. */
export const SCHEME: Record<Face, string> = {
  U: '#fefe00', // yellow
  R: '#00d800', // green
  F: '#ee0000', // red
  D: '#ffffff', // white
  L: '#0000f2', // blue
  B: '#ffa100', // orange
};

export const GRAY = '#808080';
