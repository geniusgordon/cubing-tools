import { describe, it, expect } from 'vitest';
import { parseRenderRequest } from './params';

const parse = (qs: string) => parseRenderRequest(new URL('https://cube.example.workers.dev/?' + qs));

describe('parseRenderRequest', () => {
  it('defaults: empty case, 3D view, full stage, png, size 200, no arrows', () => {
    const { options, fmt } = parseRenderRequest(new URL('https://cube.example.workers.dev/'));
    expect(options.alg).toBe('');
    expect(options.view).toBe('trans');
    expect(options.stage).toBe('full');
    expect(options.size).toBe(200);
    expect(options.arrows).toBeUndefined();
    expect(fmt).toBe('png');
  });

  it('reads case; falls back to alg alias; case wins when both present', () => {
    expect(parse("case=R%20U%20R'").options.alg).toBe("R U R'");
    expect(parse('alg=U2').options.alg).toBe('U2');
    expect(parse('case=A&alg=B').options.alg).toBe('A');
  });

  it('clamps size to 32..1024 and falls back to 200 on garbage', () => {
    expect(parse('size=10').options.size).toBe(32);
    expect(parse('size=5000').options.size).toBe(1024);
    expect(parse('size=abc').options.size).toBe(200);
  });

  it('view=plan → plan, anything else → trans (3D)', () => {
    expect(parse('view=plan').options.view).toBe('plan');
    expect(parse('view=whatever').options.view).toBe('trans');
  });

  it('arrows=pll honored only on the plan view', () => {
    expect(parse('view=plan&arrows=pll').options.arrows).toBe('pll');
    expect(parse('arrows=pll').options.arrows).toBeUndefined(); // 3D
    expect(parse('view=plan&arrows=foo').options.arrows).toBeUndefined();
  });

  it('fmt=svg recognized, otherwise png', () => {
    expect(parse('fmt=svg').fmt).toBe('svg');
    expect(parse('fmt=png').fmt).toBe('png');
    expect(parse('fmt=bogus').fmt).toBe('png');
  });

  it('passes stage through unchanged (downstream maps unknown → full)', () => {
    expect(parse('stage=oll').options.stage).toBe('oll');
  });
});
