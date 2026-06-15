# Cubing Tools — Vite + Tailwind v4 + shadcn Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the deprecated Create-React-App / Material-UI v3 / recompose stack with Vite + React 19 + Tailwind v4 + shadcn/ui, on pnpm with only latest no-known-CVE packages, deployed to GitHub Pages — preserving all four trainers (PLL recognition, COLL recognition, Cross, ZBLL) at full feature parity.

**Architecture:** The app splits into a framework-agnostic core (cube data in `data/`, pure algorithm functions in `lib/cube.ts`, and React hooks) which is preserved nearly verbatim, and a UI layer (was MUI + recompose) which is rewritten with shadcn/Tailwind. Routing stays an SPA with the same paths; GitHub Pages SPA deep-linking is handled by a `404.html` copy of `index.html` plus a Vite `base` of `/cubing-tools/`.

**Tech Stack:** pnpm, Vite 7, React 19, TypeScript 5, Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui (new-york), react-router v7, lucide-react, next-themes (dark mode), Vitest + Testing Library, ESLint flat config, Prettier.

---

## File Structure

```
.
├── .github/workflows/deploy.yml      # pnpm build → GitHub Pages
├── index.html                        # Vite entry (moved from public/)
├── vite.config.ts                    # base, react, tailwind, vitest, path alias
├── tsconfig.json / tsconfig.node.json
├── eslint.config.js                  # flat config
├── components.json                   # shadcn config
├── package.json                      # pnpm, scripts
├── public/                           # static assets (favicon etc.)
└── src/
    ├── main.tsx                      # ReactDOM root + ThemeProvider + RouterProvider
    ├── App.tsx                       # router definition
    ├── index.css                     # tailwind + shadcn theme tokens
    ├── vite-env.d.ts
    ├── components/
    │   ├── ui/*                      # ALL shadcn components (generated)
    │   ├── app-header.tsx            # was components/AppBar.tsx
    │   ├── cube-image.tsx            # was components/CubeImage.tsx
    │   ├── theme-provider.tsx        # next-themes wrapper
    │   └── mode-toggle.tsx           # dark/light toggle
    ├── lib/
    │   ├── utils.ts                  # cn() helper (shadcn)
    │   └── cube.ts                   # was src/utils.tsx (pure logic)
    ├── hooks/                        # preserved: index, use-interval, use-event-listener, use-timer, use-local-storage
    ├── data/                         # preserved verbatim: pll, coll, zbll, cross, types
    └── routes/
        ├── home.tsx                  # was containers/Home
        ├── recognition-trainer.tsx   # was containers/Trainers/RecognitionTrainer
        ├── pll.tsx                   # was PllRecognitionTrainer
        ├── cross.tsx                 # was CrossTrainer
        ├── coll/
        │   ├── index.tsx
        │   ├── coll-answer-options.tsx
        │   └── coll-card.tsx
        └── zbll/
            ├── index.tsx
            ├── timer.tsx
            ├── session-history.tsx
            ├── case-selector.tsx
            ├── alg-group.tsx
            └── zbll-case.tsx
```

**Preserved (logic) vs Rewritten (UI):**
- Preserved nearly verbatim: `data/*`, the body of every function in `lib/cube.ts`, all hooks except `useWhyDidYouUpdate` (deleted).
- Rewritten: everything that imported `@material-ui/*`, `recompose`, `classnames`, or `react-router-dom` v5 APIs (`withRouter`, `history.goBack`).

**Behavior-preservation reference (must not change):**
- localStorage keys: `@cubing-tools/settings`, `@cubing-tools/pll-recognition`, `@cubing-tools/coll-recognition`, `@cubing-tools/zbll-trainer/selected-cases`, `@cubing-tools/zbll-trainer/flashcard-map`, `@cubing-tools/zbll-trainer/session-history` (the `@cubing-tools/` prefix is added inside `useLocalStorage`).
- Spaced-repetition math (deficiency updates), case-generation, scramble decoding, `inverseAlg`, timer state machine, keyboard controls (Space = next/start-stop timer, letter/number keys = guess).

---

## Task 1: Wipe the old toolchain and scaffold Vite

**Files:**
- Delete: `package.json`, `yarn.lock`, `tsconfig.json`, `src/serviceWorker.ts`, `src/react-app-env.d.ts`, `firebase.json`, `.firebaserc`
- Preserve (move aside): `src/data/`, `src/utils.tsx`, `src/hooks/`, `public/`
- Create: new Vite project files

- [ ] **Step 1: Stash the files we keep, delete the rest**

```bash
cd /Users/gordon/Playground/cubing-tools
mkdir -p /tmp/cubing-keep
cp -R src/data /tmp/cubing-keep/data
cp src/utils.tsx /tmp/cubing-keep/utils.tsx
cp -R src/hooks /tmp/cubing-keep/hooks
cp -R public /tmp/cubing-keep/public
# Remove old source + toolchain (keep .git, docs, README, .gitignore, .prettierrc)
rm -rf src public node_modules build
rm -f package.json yarn.lock tsconfig.json firebase.json .firebaserc package-lock.json
```

- [ ] **Step 2: Confirm pnpm is available**

Run: `pnpm --version`
Expected: a version number (e.g. `9.x` or `10.x`). If "command not found", run `corepack enable pnpm` first.

- [ ] **Step 3: Scaffold a Vite React-TS project into the current directory**

```bash
cd /Users/gordon/Playground/cubing-tools
pnpm create vite@latest . --template react-ts
```

If prompted that the directory is not empty / about existing files, choose **"Ignore files and continue"** (it must not delete `.git` or `docs/`).

- [ ] **Step 4: Install dependencies and verify dev server boots**

```bash
pnpm install
pnpm run build
```

Expected: a clean `tsc -b && vite build` producing `dist/`. (The scaffold's default `App.tsx` builds fine.)

- [ ] **Step 5: Commit the scaffold**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS, remove CRA/MUI toolchain"
```

---

## Task 2: Configure Tailwind v4, path alias, and Vitest

**Files:**
- Modify: `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`
- Create: `src/index.css` (replaces scaffold `src/index.css`)
- Add deps

- [ ] **Step 1: Install Tailwind v4 and tooling**

```bash
pnpm add tailwindcss @tailwindcss/vite
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom @types/node
```

- [ ] **Step 2: Configure the path alias in `tsconfig.json` and `tsconfig.app.json`**

In `tsconfig.app.json`, add inside `compilerOptions`:

```json
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
```

In `tsconfig.json` (the solution file), add the same `compilerOptions` block so editors resolve it:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

- [ ] **Step 3: Rewrite `vite.config.ts`**

```ts
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  base: '/cubing-tools/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

Add a triple-slash reference at the very top of the file so the `test` key type-checks:

```ts
/// <reference types="vitest/config" />
```

- [ ] **Step 4: Create the Vitest setup file**

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Replace `src/index.css` with the Tailwind v4 import**

```css
@import 'tailwindcss';
```

(The full shadcn theme tokens are added in Task 4 by `shadcn init`. For now just the import.)

- [ ] **Step 6: Add scripts to `package.json`**

Set the `scripts` block to:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "postbuild": "cp dist/index.html dist/404.html",
    "preview": "vite preview",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest"
  }
```

- [ ] **Step 7: Verify build still passes**

Run: `pnpm run build`
Expected: PASS, and `dist/404.html` exists afterward.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: configure Tailwind v4, @ alias, Vitest"
```

---

## Task 3: Initialize shadcn/ui and add all components

**Files:**
- Create: `components.json`, `src/lib/utils.ts`, `src/components/ui/*`
- Modify: `src/index.css` (theme tokens written by shadcn)

- [ ] **Step 1: Run the shadcn initializer**

```bash
pnpm dlx shadcn@latest init
```

Choose: base color **Neutral**, style **new-york** (defaults are fine). This writes `components.json`, `src/lib/utils.ts` (the `cn` helper), and the shadcn theme tokens + `@custom-variant dark` into `src/index.css`.

- [ ] **Step 2: Add every shadcn component**

```bash
pnpm dlx shadcn@latest add --all --yes
```

This installs all Radix peers and generates one file per component under `src/components/ui/`. If `--all` is unavailable in the installed CLI version, list them explicitly:

```bash
pnpm dlx shadcn@latest add accordion alert alert-dialog aspect-ratio avatar badge breadcrumb button calendar card carousel chart checkbox collapsible command context-menu dialog drawer dropdown-menu form hover-card input input-otp label menubar navigation-menu pagination popover progress radio-group resizable scroll-area select separator sheet sidebar skeleton slider sonner switch table tabs textarea toggle toggle-group tooltip --yes
```

- [ ] **Step 3: Verify build compiles with all components present**

Run: `pnpm run build`
Expected: PASS. (Some chart/calendar components pull extra deps like `recharts`, `react-day-picker`, `date-fns` — the CLI installs them automatically.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: init shadcn/ui and add all components"
```

---

## Task 4: Restore the framework-agnostic core (data + hooks)

**Files:**
- Create: `src/data/{types.ts,pll.ts,coll.ts,zbll.ts,cross.ts}` (from backup)
- Create: `src/hooks/{index.ts,use-interval.ts,use-event-listener.ts,use-timer.ts,use-local-storage.ts}` (from backup, renamed)
- Delete: `useWhyDidYouUpdate`

- [ ] **Step 1: Copy data verbatim**

```bash
cd /Users/gordon/Playground/cubing-tools
mkdir -p src/data
cp /tmp/cubing-keep/data/types.ts src/data/types.ts
cp /tmp/cubing-keep/data/pll.ts   src/data/pll.ts
cp /tmp/cubing-keep/data/coll.ts  src/data/coll.ts
cp /tmp/cubing-keep/data/zbll.ts  src/data/zbll.ts
cp /tmp/cubing-keep/data/cross.ts src/data/cross.ts
```

- [ ] **Step 2: Copy hooks, dropping `useWhyDidYouUpdate`**

```bash
mkdir -p src/hooks
cp /tmp/cubing-keep/hooks/useInterval.ts      src/hooks/use-interval.ts
cp /tmp/cubing-keep/hooks/useEventListener.ts src/hooks/use-event-listener.ts
cp /tmp/cubing-keep/hooks/useTimer.ts         src/hooks/use-timer.ts
cp /tmp/cubing-keep/hooks/useLocalStorage.ts  src/hooks/use-local-storage.ts
```

- [ ] **Step 3: Fix internal import paths in the renamed hooks**

In `src/hooks/use-timer.ts`, change:

```ts
import useEventListener from './useEventListener';
import useInterval from './useInterval';
```
to
```ts
import useEventListener from './use-event-listener';
import useInterval from './use-interval';
```

(`use-local-storage.ts` imports only `../data/types`, which still resolves; leave it.)

- [ ] **Step 4: Rewrite `src/hooks/index.ts` without `useWhyDidYouUpdate`**

```ts
export { default as useEventListener } from './use-event-listener';
export { default as useInterval } from './use-interval';
export { default as useLocalStorage, useSettings } from './use-local-storage';
export { default as useTimer, TimerStatus } from './use-timer';
```

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc -b`
Expected: PASS (data + hooks compile; no UI yet imports them so no unused errors).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: restore cube data and hooks (framework-agnostic core)"
```

---

## Task 5: Port pure cube logic into `lib/cube.ts` with tests

**Files:**
- Create: `src/lib/cube.ts` (from `utils.tsx`, minus the deleted `toQueryString` consumer change — keep `toQueryString`)
- Test: `src/lib/cube.test.ts`

- [ ] **Step 1: Create `src/lib/cube.ts`** — copy the body of the old `utils.tsx` verbatim (it's pure TS, no MUI). Full content:

```ts
import { Alg, ColorNeutrality, Scramble, TestCase } from '@/data/types';
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
    .filter(key => typeof params[key] !== 'undefined')
    .map(key => key + '=' + params[key])
    .join('&');
}

export function generateCrossScramble(level: number): Scramble | null {
  if (level < 0 || level >= 8) {
    return null;
  }
  const moveNames = [
    'R', 'R2', "R'", 'F', 'F2', "F'", 'L', 'L2', "L'",
    'B', 'B2', "B'", 'U', 'U2', "U'", 'D', 'D2', "D'",
  ];
  const randomScramble =
    crossScrambles[level - 1][Math.floor(Math.random() * 1000)];
  return randomScramble
    .split('')
    .map(s => moveNames[s.charCodeAt(0) - 'A'.charCodeAt(0)]);
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
```

- [ ] **Step 2: Write failing tests** in `src/lib/cube.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  inverseAlg,
  formatTime,
  averageOfN,
  caseToString,
  generateCrossScramble,
  toQueryString,
} from './cube';
import { ColorNeutrality } from '@/data/types';

describe('inverseAlg', () => {
  it('inverts and reverses a sequence', () => {
    expect(inverseAlg("R U R'")).toBe("R U' R'");
  });
  it('keeps double turns and strips parens', () => {
    expect(inverseAlg("(R U2 R')")).toBe("R U2 R'");
  });
});

describe('formatTime', () => {
  it('formats centiseconds as s.cc', () => {
    expect(formatTime(1234)).toBe('12.34');
    expect(formatTime(5)).toBe('0.05');
  });
});

describe('averageOfN', () => {
  it('returns null when not enough samples', () => {
    expect(averageOfN([1, 2], 3)).toBeNull();
  });
  it('averages the last n samples', () => {
    expect(averageOfN([10, 20, 30, 40], 2)).toBe(35);
  });
});

describe('caseToString', () => {
  it('concatenates auf + alg + rotations', () => {
    const s = caseToString({
      alg: { name: 'T', alg: 'X' },
      preAuf: 1,
      postAuf: 0,
      yRotation: 0,
      cnRotation: 0,
    });
    expect(s).toBe('UX');
  });
});

describe('toQueryString', () => {
  it('skips undefined values', () => {
    expect(toQueryString({ a: 1, b: undefined, c: 'x' })).toBe('a=1&c=x');
  });
});

describe('generateCrossScramble', () => {
  it('returns null for out-of-range level', () => {
    expect(generateCrossScramble(0)).toBeNull();
    expect(generateCrossScramble(8)).toBeNull();
  });
  it('decodes a scramble into face moves for a valid level', () => {
    const s = generateCrossScramble(1);
    expect(Array.isArray(s)).toBe(true);
    expect(s!.length).toBeGreaterThan(0);
    expect(s!.every(m => /^[RLUDFB]2?'?$/.test(m))).toBe(true);
  });
});

// references ColorNeutrality enum to ensure import is wired
describe('ColorNeutrality', () => {
  it('has the three modes', () => {
    expect(Object.values(ColorNeutrality)).toEqual(['CN', 'D_CN', 'NON_CN']);
  });
});
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `pnpm test`
Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: port pure cube logic to lib/cube.ts with tests"
```

---

## Task 6: Theme provider, mode toggle, and global layout

**Files:**
- Create: `src/components/theme-provider.tsx`, `src/components/mode-toggle.tsx`
- Add dep: `next-themes`

- [ ] **Step 1: Install next-themes**

```bash
pnpm add next-themes
```

- [ ] **Step 2: Create `src/components/theme-provider.tsx`**

```tsx
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 3: Create `src/components/mode-toggle.tsx`**

```tsx
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add theme provider and dark-mode toggle"
```

---

## Task 7: App header (replaces MUI AppBar)

**Files:**
- Create: `src/components/app-header.tsx`

- [ ] **Step 1: Create `src/components/app-header.tsx`**

```tsx
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
}

export function AppHeader({
  title = 'Cubing Tools',
  showBack = false,
}: AppHeaderProps) {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      {showBack && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <Link to="/" className="text-lg font-semibold tracking-tight">
        {title}
      </Link>
      <div className="ml-auto">
        <ModeToggle />
      </div>
    </header>
  );
}
```

Note: `navigate(-1)` replaces v5's `history.goBack()`. `react-router` v7 exports `Link`/`useNavigate` from the `react-router` package (not `react-router-dom`).

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc -b`
Expected: FAIL only if `react-router` isn't installed yet — that's fine, it's added in Task 9. If you want a clean check now, run after Task 9.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add app header with back nav and theme toggle"
```

---

## Task 8: CubeImage (replaces MUI CubeImage, https + Skeleton)

**Files:**
- Create: `src/components/cube-image.tsx`

- [ ] **Step 1: Create `src/components/cube-image.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { toQueryString } from '@/lib/cube';

interface CubeImageProps {
  size?: number;
  alg: string;
  view?: 'plan' | 'trans';
  stage?: string;
}

export function CubeImage({ size = 200, alg, view, stage }: CubeImageProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
  }, [alg]);

  const queryString = toQueryString({
    fmt: 'svg',
    bg: 't',
    case: alg,
    view,
    stage,
    size,
  });

  return (
    <div className="relative" style={{ height: size, width: size }}>
      {loading && (
        <Skeleton className="absolute inset-0 rounded-md" />
      )}
      <img
        src={`https://cube.crider.co.uk/visualcube.php?${queryString}`}
        alt=""
        onLoad={() => setLoading(false)}
        style={{ height: size, width: size }}
        className={cn('transition-opacity', loading && 'opacity-0')}
      />
    </div>
  );
}
```

(`http://` → `https://` is the only behavior change.)

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add CubeImage (https, shadcn Skeleton)"
```

---

## Task 9: Router, App, and main entry

**Files:**
- Modify: `src/main.tsx`, `src/App.tsx`
- Add dep: `react-router`

- [ ] **Step 1: Install react-router v7**

```bash
pnpm add react-router
```

- [ ] **Step 2: Rewrite `src/App.tsx` with the route table**

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router';
import Home from '@/routes/home';
import PllRecognitionTrainer from '@/routes/pll';
import CollRecognitionTrainer from '@/routes/coll';
import CrossTrainer from '@/routes/cross';
import ZbllTrainer from '@/routes/zbll';

const router = createBrowserRouter(
  [
    { path: '/', element: <Home /> },
    { path: '/trainers/recognition/pll', element: <PllRecognitionTrainer /> },
    { path: '/trainers/recognition/coll', element: <CollRecognitionTrainer /> },
    { path: '/trainers/cross', element: <CrossTrainer /> },
    { path: '/trainers/zbll', element: <ZbllTrainer /> },
    { path: '*', element: <Home /> },
  ],
  { basename: '/cubing-tools' },
);

export default function App() {
  return <RouterProvider router={router} />;
}
```

Note: `basename` must match Vite `base` without the trailing slash. The `*` route renders Home (replaces the old `<Redirect to="/" />`).

- [ ] **Step 3: Rewrite `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ThemeProvider } from '@/components/theme-provider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
```

- [ ] **Step 4: Delete leftover scaffold files** that no longer apply:

```bash
rm -f src/App.css src/assets/react.svg
```

(If `src/App.css` was already removed, ignore.)

- [ ] **Step 5: Type-check (routes not created yet → expect missing-module errors)**

Run: `pnpm exec tsc -b`
Expected: FAIL with "Cannot find module '@/routes/...'". That's expected until Tasks 10–14. Do not commit a broken build alone; proceed to Task 10 and commit the working set there. (Or stub the route files now with `export default () => null;` and commit; they're fully written next.)

- [ ] **Step 6: Stub the five route modules so the build is green, then commit**

```bash
mkdir -p src/routes/coll src/routes/zbll
for f in src/routes/home.tsx src/routes/pll.tsx src/routes/cross.tsx src/routes/coll/index.tsx src/routes/zbll/index.tsx; do
  printf 'export default function Stub() { return null; }\n' > "$f"
done
```

Run: `pnpm run build`
Expected: PASS.

```bash
git add -A
git commit -m "feat: wire react-router v7, App, and entry point"
```

---

## Task 10: Home route

**Files:**
- Replace: `src/routes/home.tsx`

- [ ] **Step 1: Write `src/routes/home.tsx`**

```tsx
import { Link } from 'react-router';
import { AppHeader } from '@/components/app-header';
import { Card, CardContent } from '@/components/ui/card';

const TRAINERS = [
  {
    title: 'PLL Recognition Trainer',
    image:
      'https://cube.crider.co.uk/visualcube.php?fmt=svg&size=200&stage=ll',
    to: '/trainers/recognition/pll',
  },
  {
    title: 'COLL Recognition Trainer',
    image:
      'https://cube.crider.co.uk/visualcube.php?fmt=svg&size=200&stage=coll',
    to: '/trainers/recognition/coll',
  },
  {
    title: 'Cross Trainer',
    image:
      'https://cube.crider.co.uk/visualcube.php?fmt=svg&size=200&stage=cross-x2',
    to: '/trainers/cross',
  },
  {
    title: 'ZBLL Trainer',
    image:
      "https://cube.crider.co.uk/visualcube.php?fmt=svg&size=200&stage=ll&case=(RUR'U')(RU'RU2R2)(U'RUR'U')(R2U'R2U')",
    to: '/trainers/zbll',
  },
];

export default function Home() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto grid max-w-2xl grid-cols-1 gap-6 p-6 sm:grid-cols-2">
        {TRAINERS.map(t => (
          <Link key={t.to} to={t.to} className="no-underline">
            <Card className="transition-colors hover:bg-accent">
              <CardContent className="flex flex-col items-center gap-4 p-6">
                <img src={t.image} alt="" className="h-32 w-32" />
                <h2 className="text-center text-lg font-medium">{t.title}</h2>
              </CardContent>
            </Card>
          </Link>
        ))}
      </main>
    </>
  );
}
```

- [ ] **Step 2: Verify it renders in the dev server**

Run: `pnpm dev`, open the printed URL (note it serves under `/cubing-tools/`). Confirm four cards appear. Stop the server with Ctrl-C.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: home route with shadcn cards"
```

---

## Task 11: Shared RecognitionTrainer + PLL route

**Files:**
- Create: `src/routes/recognition-trainer.tsx`
- Replace: `src/routes/pll.tsx`

- [ ] **Step 1: Create `src/routes/recognition-trainer.tsx`**

```tsx
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AppHeader } from '@/components/app-header';
import { CubeImage } from '@/components/cube-image';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useEventListener, useSettings, useLocalStorage } from '@/hooks';
import { generateCase, caseToString, randomChoice } from '@/lib/cube';
import {
  AlgWithAuf,
  ColorNeutrality,
  FlashCard,
  TestCase,
} from '@/data/types';

interface RecognitionTrainerProps {
  title: string;
  gamma?: number;
  flashCardName: string;
  defaultFlashCardMap: Record<string, FlashCard<AlgWithAuf>>;
  checkKeyInCases(case_: TestCase, key: string): boolean;
  checkIsCorrect(case_: TestCase, guess: string | null): boolean;
  renderAnswerOptions(props: {
    currentCase: TestCase;
    currentGuess: string | null;
    takeGuess(guess: string): void;
  }): ReactNode;
}

const CN_OPTIONS = [
  { value: ColorNeutrality.NON_CN, label: 'Non CN' },
  { value: ColorNeutrality.D_CN, label: 'Dual CN' },
  { value: ColorNeutrality.CN, label: 'CN' },
];

export function RecognitionTrainer({
  title,
  gamma = 0.5,
  flashCardName,
  defaultFlashCardMap,
  checkKeyInCases,
  checkIsCorrect,
  renderAnswerOptions,
}: RecognitionTrainerProps) {
  const [settings, updateSettings] = useSettings();

  const [flashCardMap, setFlashCardMap] = useLocalStorage<
    Record<string, FlashCard<AlgWithAuf>>
  >(flashCardName, defaultFlashCardMap);

  const cases = useMemo(
    () => Object.keys(defaultFlashCardMap),
    [defaultFlashCardMap],
  );

  const pickCaseFromFlashCards = useCallback(
    (cn: ColorNeutrality) => {
      const c = randomChoice(
        cases,
        cases.map(name => flashCardMap[name].deficiency),
      );
      const { data } = flashCardMap[c];
      return generateCase(data, { cn, preAuf: data.preAuf });
    },
    [cases, flashCardMap],
  );

  const [currentCase, setCurrentCase] = useState<TestCase>(() =>
    pickCaseFromFlashCards(settings.colorNeutrality),
  );
  const [currentGuess, setCurrentGuess] = useState<string | null>(null);

  const generateNextCase = useCallback(
    (cn: ColorNeutrality) => {
      setCurrentCase(pickCaseFromFlashCards(cn));
      setCurrentGuess(null);
    },
    [pickCaseFromFlashCards],
  );

  const takeGuess = useCallback(
    (guess: string) => {
      const flashCard = flashCardMap[currentCase.alg.name];
      if (!flashCard) {
        return;
      }
      setCurrentGuess(guess);
      const isCorrect = checkIsCorrect(currentCase, guess);
      const newDeficiency = isCorrect
        ? flashCard.deficiency * (1 - gamma)
        : flashCard.deficiency * (1 + gamma);
      setFlashCardMap({
        ...flashCardMap,
        [currentCase.alg.name]: { ...flashCard, deficiency: newDeficiency },
      });
    },
    [currentCase, flashCardMap, gamma, checkIsCorrect, setFlashCardMap],
  );

  const handleKeyup = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === ' ') {
        generateNextCase(settings.colorNeutrality);
        return;
      }
      if (checkKeyInCases(currentCase, e.key.toUpperCase())) {
        takeGuess(e.key.toUpperCase());
      }
    },
    [
      settings.colorNeutrality,
      currentCase,
      generateNextCase,
      takeGuess,
      checkKeyInCases,
    ],
  );

  useEventListener('keyup', handleKeyup);

  function handleCnChange(value: string) {
    updateSettings({ colorNeutrality: value as ColorNeutrality });
    generateNextCase(value as ColorNeutrality);
  }

  return (
    <>
      <AppHeader title={title} showBack />
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-6 p-6">
        <button
          type="button"
          className="cursor-pointer"
          onClick={() => generateNextCase(settings.colorNeutrality)}
          aria-label="Next case"
        >
          <CubeImage alg={caseToString(currentCase)} size={200} />
        </button>

        <div className="flex flex-col items-center gap-2">
          <Label>Color Neutrality</Label>
          <RadioGroup
            value={settings.colorNeutrality}
            onValueChange={handleCnChange}
            className="flex flex-row gap-4"
          >
            {CN_OPTIONS.map(o => (
              <div key={o.value} className="flex items-center gap-2">
                <RadioGroupItem value={o.value} id={`cn-${o.value}`} />
                <Label htmlFor={`cn-${o.value}`}>{o.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {renderAnswerOptions({ currentCase, currentGuess, takeGuess })}
      </main>
    </>
  );
}
```

- [ ] **Step 2: Write `src/routes/pll.tsx`**

```tsx
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import pllMap, { pllGroups, pllAlgs } from '@/data/pll';
import { AlgWithAuf, FlashCard, TestCase } from '@/data/types';
import { RecognitionTrainer } from './recognition-trainer';

const defaultFlashCardMap: Record<string, FlashCard<AlgWithAuf>> = {};
pllAlgs.slice(0, 1).forEach(alg =>
  [...new Array(4)].forEach((_, i) => {
    const name = `${alg.name}-${i}`;
    defaultFlashCardMap[name] = {
      data: { name, alg: alg.alg, preAuf: i },
      deficiency: 1,
    };
  }),
);

function checkKeyInCases(_case: TestCase, key: string): boolean {
  if (/[a-zA-Z]/.test(key)) {
    return Object.keys(pllMap).includes(key);
  }
  return false;
}

function checkIsCorrect(case_: TestCase, guess: string | null): boolean {
  return case_.alg.name[0] === guess;
}

export default function PllRecognitionTrainer() {
  return (
    <RecognitionTrainer
      title="PLL Recognition Trainer"
      flashCardName="pll-recognition"
      defaultFlashCardMap={defaultFlashCardMap}
      checkKeyInCases={checkKeyInCases}
      checkIsCorrect={checkIsCorrect}
      renderAnswerOptions={({ currentCase, currentGuess, takeGuess }) => (
        <div className="flex flex-col items-center gap-2">
          {pllGroups.map(group => (
            <div key={group.name} className="flex flex-wrap justify-center gap-2">
              {group.cases.map(c => {
                const isCurrent = currentGuess === c;
                const isCorrect = checkIsCorrect(currentCase, currentGuess);
                return (
                  <Button
                    key={c}
                    onClick={() => takeGuess(c)}
                    className={cn(
                      isCurrent && isCorrect && 'bg-green-600 hover:bg-green-600',
                      isCurrent && !isCorrect && 'bg-red-600 hover:bg-red-600',
                    )}
                  >
                    {c}
                  </Button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    />
  );
}
```

- [ ] **Step 3: Build + manual smoke**

Run: `pnpm run build` (expect PASS), then `pnpm dev` and visit `/cubing-tools/trainers/recognition/pll`. Confirm: cube renders, clicking it advances, letter keys mark green/red, Space advances, CN radios switch. Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: PLL recognition trainer + shared RecognitionTrainer"
```

---

## Task 12: COLL route (index + answer options + card)

**Files:**
- Replace: `src/routes/coll/index.tsx`
- Create: `src/routes/coll/coll-answer-options.tsx`, `src/routes/coll/coll-card.tsx`

- [ ] **Step 1: Write `src/routes/coll/coll-card.tsx`**

```tsx
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { collGroups } from '@/data/coll';
import { CubeImage } from '@/components/cube-image';
import { Alg, TestCase } from '@/data/types';

interface CollCardProps {
  alg: Alg;
  currentCase: TestCase;
  currentGuess: string | null;
  checkIsCorrect(case_: TestCase, guess: string | null): boolean;
  onClick(): void;
}

function checkIsCurrent(
  case_: TestCase,
  guess: string | null,
  alg: Alg,
): boolean {
  if (!guess) {
    return false;
  }
  const group = case_.alg.name.split('/')[0];
  const options = collGroups[group].map(name => `${group}/${name}`);
  return options[parseInt(guess) - 1] === alg.name;
}

export function CollCard({
  alg,
  currentCase,
  currentGuess,
  checkIsCorrect,
  onClick,
}: CollCardProps) {
  const isCurrent = checkIsCurrent(currentCase, currentGuess, alg);
  const isCorrect = checkIsCorrect(currentCase, currentGuess);

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer overflow-hidden transition-colors hover:bg-accent"
    >
      <CardContent className="flex flex-col items-center gap-2 p-3">
        <CubeImage alg={alg.alg} size={100} view="plan" stage="coll" />
        <span
          className={cn(
            'rounded px-2 py-1 text-lg font-medium',
            isCurrent && isCorrect && 'bg-green-600 text-white',
            isCurrent && !isCorrect && 'bg-red-600 text-white',
          )}
        >
          {alg.name.split('/')[1]}
        </span>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Write `src/routes/coll/coll-answer-options.tsx`**

```tsx
import collMap, { collGroups } from '@/data/coll';
import { TestCase } from '@/data/types';
import { CollCard } from './coll-card';

interface CollAnswerOptionsProps {
  currentCase: TestCase;
  currentGuess: string | null;
  checkIsCorrect(case_: TestCase, guess: string | null): boolean;
  takeGuess(guess: string): void;
}

export function CollAnswerOptions({
  currentCase,
  currentGuess,
  checkIsCorrect,
  takeGuess,
}: CollAnswerOptionsProps) {
  const group = currentCase.alg.name.split('/')[0];
  const options = collGroups[group].map(name => ({
    name: `${group}/${name}`,
    alg: collMap[group][name],
  }));

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {options.map((alg, i) => (
        <CollCard
          key={alg.name}
          alg={alg}
          currentCase={currentCase}
          currentGuess={currentGuess}
          checkIsCorrect={checkIsCorrect}
          onClick={() => takeGuess((i + 1).toString())}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write `src/routes/coll/index.tsx`**

```tsx
import { collGroups, collAlgs } from '@/data/coll';
import { AlgWithAuf, FlashCard, TestCase } from '@/data/types';
import { RecognitionTrainer } from '../recognition-trainer';
import { CollAnswerOptions } from './coll-answer-options';

const defaultFlashCardMap: Record<string, FlashCard<AlgWithAuf>> = {};
collAlgs.slice(0, 1).forEach(alg =>
  [...new Array(4)].forEach((_, i) => {
    const name = `${alg.name}-${i}`;
    defaultFlashCardMap[name] = {
      data: { name, alg: alg.alg, preAuf: i },
      deficiency: 1,
    };
  }),
);

function checkKeyInCases(case_: TestCase, key: string): boolean {
  const group = case_.alg.name.split('/')[0];
  if (collGroups[group].length === 4) {
    return /[1-4]/.test(key);
  }
  return /[1-6]/.test(key);
}

function checkIsCorrect(case_: TestCase, guess: string | null): boolean {
  if (!guess) {
    return false;
  }
  const group = case_.alg.name.split('/')[0];
  const options = collGroups[group].map(name => `${group}/${name}`);
  return options[parseInt(guess) - 1] === case_.alg.name;
}

export default function CollRecognitionTrainer() {
  return (
    <RecognitionTrainer
      title="COLL Recognition Trainer"
      flashCardName="coll-recognition"
      defaultFlashCardMap={defaultFlashCardMap}
      checkKeyInCases={checkKeyInCases}
      checkIsCorrect={checkIsCorrect}
      renderAnswerOptions={({ currentCase, currentGuess, takeGuess }) => (
        <CollAnswerOptions
          currentCase={currentCase}
          currentGuess={currentGuess}
          checkIsCorrect={checkIsCorrect}
          takeGuess={takeGuess}
        />
      )}
    />
  );
}
```

Note: `collAlgs` is exported by `@/data/coll` (verify the export exists; the original imported `collAlgs` in `Coll/index.tsx`).

- [ ] **Step 4: Build + smoke**

Run: `pnpm run build` (PASS), `pnpm dev`, visit `/cubing-tools/trainers/recognition/coll`. Confirm cube cards render, number keys 1–6 select with green/red, Space advances. Ctrl-C.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: COLL recognition trainer"
```

---

## Task 13: Cross route

**Files:**
- Replace: `src/routes/cross.tsx`

- [ ] **Step 1: Write `src/routes/cross.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettings } from '@/hooks';
import { generateCrossScramble } from '@/lib/cube';
import { Scramble } from '@/data/types';

export default function CrossTrainer() {
  const [currentScramble, setScramble] = useState<Scramble | null>(null);
  const [settings, updateSettings] = useSettings();

  const nextScramble = useCallback(() => {
    setScramble(generateCrossScramble(settings.crossLevel));
  }, [settings.crossLevel]);

  useEffect(() => {
    function handleKeyup(e: KeyboardEvent) {
      if (e.key === ' ') {
        nextScramble();
      }
    }
    document.addEventListener('keyup', handleKeyup);
    return () => document.removeEventListener('keyup', handleKeyup);
  }, [nextScramble]);

  useEffect(() => {
    nextScramble();
  }, [nextScramble]);

  return (
    <>
      <AppHeader title="Cross Trainer" showBack />
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-6 p-6">
        <div className="flex flex-col items-center gap-2">
          <Label htmlFor="level">Level</Label>
          <Select
            value={String(settings.crossLevel)}
            onValueChange={v => updateSettings({ crossLevel: Number(v) })}
          >
            <SelectTrigger id="level" className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...Array(8)].map((_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={nextScramble}>Next Scramble</Button>

        <Card className="w-full">
          <CardContent className="p-8 text-center text-2xl font-medium">
            {currentScramble ? currentScramble.join(' ') : ''}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Build + smoke**

Run: `pnpm run build` (PASS), `pnpm dev`, visit `/cubing-tools/trainers/cross`. Confirm scramble shows, level select changes difficulty, Next Scramble + Space regenerate. Ctrl-C.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: cross trainer"
```

---

## Task 14: ZBLL Timer + SessionHistory subcomponents

**Files:**
- Create: `src/routes/zbll/timer.tsx`, `src/routes/zbll/session-history.tsx`

- [ ] **Step 1: Write `src/routes/zbll/timer.tsx`**

```tsx
import { cn } from '@/lib/utils';
import { useTimer, TimerStatus } from '@/hooks';
import { formatTime } from '@/lib/cube';

interface TimerProps {
  onEnd(time: number): void;
}

const STATUS_COLOR: Record<TimerStatus, string> = {
  [TimerStatus.STOPPED]: 'text-foreground',
  [TimerStatus.READY]: 'text-green-600',
  [TimerStatus.RUNNING]: 'text-foreground',
};

export function Timer({ onEnd }: TimerProps) {
  const { time, status } = useTimer({ onEnd });
  return (
    <div
      className={cn(
        'font-mono text-6xl tabular-nums',
        STATUS_COLOR[status],
      )}
    >
      {formatTime(time)}
    </div>
  );
}
```

Note: the original MUI Timer colored the digits by status (green when READY/holding). This reproduces that. Verify `useTimer`'s signature matches: `useTimer({ onHold?, onStart?, onEnd? })` returning `{ time, status }`.

- [ ] **Step 2: Write `src/routes/zbll/session-history.tsx`** — full parity with the original: a selected-solve detail panel (scramble + time + cube image), a Best/Worst/Ao5/Ao12 stat strip, a clickable grid of solve times, and confirm dialogs for Delete/Clear.

```tsx
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CubeImage } from '@/components/cube-image';
import { History } from '@/data/types';
import { inverseAlg, formatTime, averageOfN } from '@/lib/cube';

interface SessionHistoryProps {
  sessionHistory: History[];
  onDelete(index: number): void;
  onClear(): void;
}

type Alert = 'delete' | 'clear' | null;

function Stat({ title, time }: { title: string; time: number | null }) {
  if (time === null) return null;
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{title}</span>
      <span className="text-xl font-medium tabular-nums">
        {formatTime(time)}
      </span>
    </div>
  );
}

export function SessionHistory({
  sessionHistory,
  onDelete,
  onClear,
}: SessionHistoryProps) {
  const [alert, setAlert] = useState<Alert>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // keep the latest solve selected as history grows/shrinks (original behavior)
  useEffect(() => {
    setSelectedIndex(sessionHistory.length - 1);
  }, [sessionHistory.length]);

  const times = sessionHistory.map(h => h.time);
  const best = times.length ? Math.min(...times) : null;
  const worst = times.length ? Math.max(...times) : null;
  const ao5 = averageOfN(times, 5);
  const ao12 = averageOfN(times, 12);

  const selected = sessionHistory[selectedIndex];

  function confirm() {
    if (alert === 'delete') onDelete(selectedIndex);
    else if (alert === 'clear') onClear();
    setAlert(null);
  }

  return (
    <>
      <div className="grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
        {selected && (
          <Card>
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold">
                  Solve #{selectedIndex}
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAlert('delete')}
                >
                  Delete
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">Scramble</span>
              <span className="font-medium">{inverseAlg(selected.alg.alg)}</span>
              <span className="text-xs text-muted-foreground">Time</span>
              <span className="text-xl font-medium tabular-nums">
                {formatTime(selected.time)}
              </span>
              <CubeImage alg={selected.alg.alg} size={160} />
            </CardContent>
          </Card>
        )}

        {sessionHistory.length > 0 && (
          <Card>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold">Times</h3>
                <Button size="sm" variant="ghost" onClick={() => setAlert('clear')}>
                  Clear
                </Button>
              </div>
              <div className="flex flex-wrap gap-4">
                <Stat title="Best" time={best} />
                <Stat title="Worst" time={worst} />
                <Stat title="Ao5" time={ao5} />
                <Stat title="Ao12" time={ao12} />
              </div>
              <div className="flex flex-wrap gap-1">
                {sessionHistory.map((h, i) => (
                  <Button
                    key={`${h.alg.name}-${i}`}
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedIndex(i)}
                    className={cn(
                      'tabular-nums',
                      i === selectedIndex && 'bg-green-300 text-black hover:bg-green-300',
                    )}
                  >
                    {formatTime(h.time)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={alert !== null} onOpenChange={o => !o && setAlert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

Note: this matches the original `SessionHistory.tsx` (selected-solve detail, Best/Worst/Ao5/Ao12, solve-time grid, confirm dialogs). The original also accepted an unused `setSessionHistory` prop — dropped here; the parent's `onDelete`/`onClear` cover all mutations.

- [ ] **Step 3: Build (Timer/History not yet imported anywhere → fine)**

Run: `pnpm exec tsc -b`
Expected: PASS (modules compile standalone).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: ZBLL timer and session history components"
```

---

## Task 15: ZBLL CaseSelector (Dialog) + AlgGroup + ZbllCase

**Files:**
- Create: `src/routes/zbll/alg-group.tsx`, `src/routes/zbll/zbll-case.tsx`, `src/routes/zbll/case-selector.tsx`

Confirmed during planning (no further git archaeology needed):
- `@/data/coll` exports `collMap` (default) + `collGroups, collAlgs, ollGroups, ollAlgs`.
- **`AlgGroup` is a single drill-down tile** (one cube image + `count/total` badge; when `active`, shows All/None buttons). The parent `CaseSelector` maps over `ollAlgs` / coll options / zbll options and renders one `AlgGroup` (or `ZbllCase`) per item.
- **`ZbllCase` is a single selectable leaf tile** (cube image, green tint when selected).
- The original `total` per badge: OLL tile → `collGroups[oll].length * 12`, COLL tile → `12`.

- [ ] **Step 1: Write `src/routes/zbll/zbll-case.tsx`** — one selectable leaf cube:

```tsx
import { cn } from '@/lib/utils';
import { CubeImage } from '@/components/cube-image';
import { Alg } from '@/data/types';

interface ZbllCaseProps {
  alg: Alg;
  selected: boolean;
  onSelect(alg: Alg): void;
}

export function ZbllCase({ alg, selected, onSelect }: ZbllCaseProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(alg)}
      className={cn(
        'cursor-pointer rounded-md p-1 transition-colors',
        selected && 'bg-green-300',
      )}
    >
      <CubeImage alg={alg.alg} size={80} view="plan" />
    </button>
  );
}
```

- [ ] **Step 2: Write `src/routes/zbll/alg-group.tsx`** — one OLL/COLL drill-down tile with a count badge and All/None when active:

```tsx
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CubeImage } from '@/components/cube-image';
import { collGroups } from '@/data/coll';
import { Alg } from '@/data/types';

interface AlgGroupProps {
  active?: boolean;
  alg: Alg;
  stage: 'oll' | 'coll';
  selectedCount: Record<string, number>;
  onSelect(alg: Alg): void;
  onAllClick(alg: Alg): void;
  onNoneClick(alg: Alg): void;
}

export function AlgGroup({
  active,
  alg,
  stage,
  selectedCount,
  onSelect,
  onAllClick,
  onNoneClick,
}: AlgGroupProps) {
  const oll = alg.name.split('/')[0];
  const count = selectedCount[alg.name] || 0;
  const total = stage === 'oll' ? collGroups[oll].length * 12 : 12;

  return (
    <div className="m-1 flex flex-col items-center">
      <button
        type="button"
        onClick={() => onSelect(alg)}
        className={cn(
          'relative cursor-pointer rounded-md p-1 transition-colors',
          active && 'bg-green-300',
        )}
      >
        <CubeImage alg={alg.alg} size={100} stage={stage} view="plan" />
        <span className="absolute bottom-0 right-0 rounded bg-neutral-600 px-1 text-xs text-neutral-50">
          {count} / {total}
        </span>
      </button>
      <div className="flex h-9 items-center">
        {active && (
          <>
            <Button variant="ghost" size="sm" onClick={() => onAllClick(alg)}>
              All
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onNoneClick(alg)}>
              None
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/routes/zbll/case-selector.tsx`** — shadcn `Dialog` reproducing the original three-level drill-down (OLL → COLL → ZBLL) plus All/None bulk actions. Selection state machine ported verbatim from the original `CaseSelector.tsx`:

```tsx
import { useCallback, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import collMap, { collGroups, ollAlgs } from '@/data/coll';
import zbllMap from '@/data/zbll';
import { Alg } from '@/data/types';
import { AlgGroup } from './alg-group';
import { ZbllCase } from './zbll-case';

interface CaseSelectorProps {
  open: boolean;
  selectedCases: Record<string, boolean>;
  onClose(): void;
  onSubmit(cases: Record<string, boolean>): void;
}

export function CaseSelector({
  open,
  selectedCases,
  onClose,
  onSubmit,
}: CaseSelectorProps) {
  const [cases, setCases] = useState<Record<string, boolean>>(selectedCases);
  const [oll, setOll] = useState<string | null>(null);
  const [coll, setColl] = useState<string | null>(null);

  const selectedOllCollAlgs = useMemo(() => {
    if (!oll) return null;
    return collGroups[oll].map(c => ({
      name: `${oll}/${c}`,
      alg: collMap[oll][c],
    }));
  }, [oll]);

  const selectedCollZbllAlgs = useMemo(() => {
    if (!oll || !coll) return null;
    const c = coll.split('/')[1];
    return Object.keys(zbllMap[oll][c]).map(zbll => ({
      name: `${oll}/${c}/${zbll}`,
      alg: zbllMap[oll][c][zbll][0],
    }));
  }, [oll, coll]);

  const selectedCount = useMemo(() => {
    const count: Record<string, number> = {};
    Object.keys(cases).forEach(key => {
      const parts = key.split('/');
      const ollKey = parts[0];
      const collKey = `${parts[0]}/${parts[1]}`;
      if (cases[key]) {
        count[ollKey] = (count[ollKey] ?? 0) + 1;
        count[collKey] = (count[collKey] ?? 0) + 1;
      }
    });
    return count;
  }, [cases]);

  const handleOllSelect = useCallback((alg: Alg) => {
    setColl(null);
    setOll(alg.name);
  }, []);

  const handleCollSelect = useCallback((alg: Alg) => {
    setColl(alg.name);
  }, []);

  const handleZbllSelect = useCallback((alg: Alg) => {
    setCases(prev => ({ ...prev, [alg.name]: !prev[alg.name] }));
  }, []);

  // All/None operate on an OLL (parts.length === 1) or a COLL prefix.
  const bulkSet = useCallback((alg: Alg, value: boolean) => {
    const parts = alg.name.split('/');
    const ollKey = parts[0];
    setCases(prev => {
      const next = { ...prev };
      const colls = parts.length === 1 ? collGroups[ollKey] : [parts[1]];
      colls.forEach(c => {
        Object.keys(zbllMap[ollKey][c]).forEach(zbll => {
          next[`${ollKey}/${c}/${zbll}`] = value;
        });
      });
      return next;
    });
  }, []);

  const handleAllClick = useCallback(
    (alg: Alg) => bulkSet(alg, true),
    [bulkSet],
  );
  const handleNoneClick = useCallback(
    (alg: Alg) => bulkSet(alg, false),
    [bulkSet],
  );

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="flex flex-row items-center gap-3 border-b px-4 py-3">
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
          <DialogTitle className="flex-1">ZBLL Case Selector</DialogTitle>
          <Button onClick={() => onSubmit(cases)}>Done</Button>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] p-4">
          <div className="flex flex-wrap justify-center">
            {ollAlgs.map(alg => (
              <AlgGroup
                key={alg.name}
                active={alg.name === oll}
                alg={alg}
                stage="oll"
                selectedCount={selectedCount}
                onSelect={handleOllSelect}
                onAllClick={handleAllClick}
                onNoneClick={handleNoneClick}
              />
            ))}
          </div>

          {selectedOllCollAlgs && (
            <div className="flex flex-wrap justify-center border-t pt-2">
              {selectedOllCollAlgs.map(alg => (
                <AlgGroup
                  key={alg.name}
                  active={alg.name === coll}
                  alg={alg}
                  stage="coll"
                  selectedCount={selectedCount}
                  onSelect={handleCollSelect}
                  onAllClick={handleAllClick}
                  onNoneClick={handleNoneClick}
                />
              ))}
            </div>
          )}

          {selectedCollZbllAlgs && (
            <div className="flex flex-wrap justify-center gap-1 border-t pt-2">
              {selectedCollZbllAlgs.map(alg => (
                <ZbllCase
                  key={alg.name}
                  alg={alg}
                  selected={!!cases[alg.name]}
                  onSelect={handleZbllSelect}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
```

Note: `DialogContent` in current shadcn renders its own close button; `showCloseButton={false}` suppresses it since we provide the styled one in the header (if the installed `dialog.tsx` lacks that prop, omit it and delete the manual close button instead). The OLL/COLL `total` badge math (`collGroups[oll].length * 12` and `12`) matches the original exactly.

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: ZBLL case selector dialog + alg group + case tile"
```

---

## Task 16: ZBLL route (assembles everything)

**Files:**
- Replace: `src/routes/zbll/index.tsx`

- [ ] **Step 1: Write `src/routes/zbll/index.tsx`** — port the original Zbll `index.tsx` logic (spaced-rep deficiency math, history add/delete/clear, scramble = `inverseAlg(currentCase.alg)`):

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks';
import { randomChoice, inverseAlg } from '@/lib/cube';
import { ollGroups, collGroups } from '@/data/coll';
import zbllMap from '@/data/zbll';
import { Alg, FlashCard, History } from '@/data/types';
import { CaseSelector } from './case-selector';
import { Timer } from './timer';
import { SessionHistory } from './session-history';

type ZbllFlashCard = FlashCard<{ alg: Alg; count: number }>;

const defaultFlashCardMap: Record<string, ZbllFlashCard> = {};
ollGroups.forEach(oll => {
  collGroups[oll].forEach(coll => {
    Object.keys(zbllMap[oll][coll]).forEach(zbll => {
      const name = `${oll}/${coll}/${zbll}`;
      defaultFlashCardMap[name] = {
        data: { alg: { name, alg: '' }, count: 0 },
        deficiency: 0,
      };
    });
  });
});

export default function ZbllTrainer() {
  const [caseSelectorOpen, setCaseSelectorOpen] = useState(false);

  const [selectedCases, setCases] = useLocalStorage<Record<string, boolean>>(
    'zbll-trainer/selected-cases',
    {},
  );
  const [flashCardMap, setFlashCardMap] = useLocalStorage<
    Record<string, ZbllFlashCard>
  >('zbll-trainer/flashcard-map', defaultFlashCardMap);
  const [sessionHistory, setSessionHistory] = useLocalStorage<History[]>(
    'zbll-trainer/session-history',
    [],
  );

  const [currentCase, setCurrentCase] = useState<Alg | null>(null);

  const cases = useMemo(
    () => Object.keys(selectedCases).filter(name => selectedCases[name]),
    [selectedCases],
  );

  const pickCaseFromFlashCards = useCallback((): Alg | null => {
    if (cases.length === 0) return null;
    const probs = cases.map(c =>
      flashCardMap[c].data.count === 0 ? 1000 : flashCardMap[c].deficiency,
    );
    const c = randomChoice(cases, probs);
    const flashCard = flashCardMap[c];
    if (!flashCard) return null;
    const [oll, coll, zbll] = flashCard.data.alg.name.split('/');
    const algs = zbllMap[oll][coll][zbll];
    const alg = randomChoice(algs, algs.map(() => 1));
    return { name: flashCard.data.alg.name, alg };
  }, [cases, flashCardMap]);

  const generateNextCase = useCallback(() => {
    setCurrentCase(pickCaseFromFlashCards());
  }, [pickCaseFromFlashCards]);

  const handleTimerEnd = useCallback(
    (time: number) => {
      if (!currentCase) return;
      const flashCard = flashCardMap[currentCase.name];
      if (!flashCard) return;
      setSessionHistory([...sessionHistory, { alg: currentCase, time }]);
      const newDeficiency =
        (flashCard.deficiency * flashCard.data.count + time) /
        (flashCard.data.count + 1);
      setFlashCardMap({
        ...flashCardMap,
        [currentCase.name]: {
          data: { alg: flashCard.data.alg, count: flashCard.data.count + 1 },
          deficiency: newDeficiency,
        },
      });
      // No explicit generateNextCase() here: setFlashCardMap changes
      // pickCaseFromFlashCards' identity, which re-runs the effect below
      // and produces the next case (matches original behavior — avoids
      // double-generation).
    },
    [
      currentCase,
      flashCardMap,
      sessionHistory,
      setSessionHistory,
      setFlashCardMap,
    ],
  );

  function handleHistoryDelete(index: number) {
    if (index < 0 || index >= sessionHistory.length) return;
    const case_ = sessionHistory[index];
    const flashCard = flashCardMap[case_.alg.name];
    setSessionHistory([
      ...sessionHistory.slice(0, index),
      ...sessionHistory.slice(index + 1),
    ]);
    if (!flashCard) return;
    const newDeficiency =
      flashCard.data.count <= 1
        ? 0
        : (flashCard.deficiency * flashCard.data.count - case_.time) /
          (flashCard.data.count - 1);
    setFlashCardMap({
      ...flashCardMap,
      [case_.alg.name]: {
        data: { alg: flashCard.data.alg, count: flashCard.data.count - 1 },
        deficiency: newDeficiency,
      },
    });
  }

  function handleCaseSubmit(next: Record<string, boolean>) {
    setCases(next);
    setCaseSelectorOpen(false);
  }

  useEffect(() => {
    generateNextCase();
  }, [generateNextCase]);

  return (
    <>
      <AppHeader title="ZBLL Trainer" showBack />
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-4 p-6">
        <Button variant="outline" onClick={() => setCaseSelectorOpen(true)}>
          Select Cases
        </Button>
        <p className="text-sm text-muted-foreground">{cases.length} selected</p>
        <p className="min-h-9 text-center text-3xl font-medium">
          {currentCase ? inverseAlg(currentCase.alg) : ''}
        </p>
        <div className="py-8">
          <Timer onEnd={handleTimerEnd} />
        </div>
        <SessionHistory
          sessionHistory={sessionHistory}
          onDelete={handleHistoryDelete}
          onClear={() => setSessionHistory([])}
        />
      </main>
      <CaseSelector
        open={caseSelectorOpen}
        selectedCases={selectedCases}
        onClose={() => setCaseSelectorOpen(false)}
        onSubmit={handleCaseSubmit}
      />
    </>
  );
}
```

Behavior notes preserved from original: count==0 cases get priority weight 1000; deficiency is a running mean of solve times; the next case appears automatically because `setFlashCardMap` after a solve changes `pickCaseFromFlashCards`'s identity, re-running the mount effect (same mechanism as the original). Deleting a solve reverses the running mean, with a guard against `count → 0` division (the original divided by `count - 1` unconditionally — a safe, intended fix).

- [ ] **Step 2: Build + full smoke**

Run: `pnpm run build` (PASS), `pnpm dev`, visit `/cubing-tools/trainers/zbll`. Confirm: Select Cases opens the dialog, drill down OLL→COLL→ZBLL, All/None work, Done persists; scramble appears; Space holds (green) then starts timer, Space stops; solve lands in history with ao5/ao12; delete + clear work; reload preserves selection/history (localStorage). Ctrl-C.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: ZBLL trainer route (timer, spaced-rep, history)"
```

---

## Task 17: ESLint flat config + Prettier

**Files:**
- Modify: `eslint.config.js` (Vite scaffold provides one), `package.json`
- Keep: `.prettierrc`

- [ ] **Step 1: Add prettier + eslint-config-prettier**

```bash
pnpm add -D prettier eslint-config-prettier
```

- [ ] **Step 2: Append `eslint-config-prettier` to `eslint.config.js`** so formatting rules don't fight Prettier. Add `import eslintConfigPrettier from 'eslint-config-prettier';` and include `eslintConfigPrettier` as the last entry of the exported config array.

- [ ] **Step 3: Run lint and fix what it flags**

Run: `pnpm run lint`
Expected: PASS (fix any unused-import/any warnings surfaced; the ported files are clean of MUI now).

- [ ] **Step 4: Format the codebase**

```bash
pnpm exec prettier --write "src/**/*.{ts,tsx,css}"
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: eslint flat config + prettier integration"
```

---

## Task 18: GitHub Pages deploy + final cleanup

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md`, `.gitignore`
- Delete: any remaining CRA/firebase leftovers, `/tmp/cubing-keep` is outside repo (ignore)

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Confirm `postbuild` produced `dist/404.html`**

Run: `pnpm run build && ls dist/404.html`
Expected: the file exists (SPA deep-link fallback for GitHub Pages).

- [ ] **Step 3: Update `README.md`**

```markdown
# Cubing Tools

Speedcubing trainers (PLL/COLL recognition, Cross, ZBLL) built with Vite, React, Tailwind v4, and shadcn/ui.

## Develop

    pnpm install
    pnpm dev

## Build

    pnpm build      # outputs to dist/ (incl. 404.html for SPA routing)

## Deploy

Pushing to `master` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
Enable Pages → "GitHub Actions" in the repo settings once.

Cube images are rendered by the third-party `visualcube.php` service.
```

- [ ] **Step 4: Verify no stale references remain**

```bash
grep -rn "material-ui\|recompose\|react-scripts\|firebase\|react-app-env" src package.json || echo "clean"
```
Expected: `clean`.

- [ ] **Step 5: Full gate — build, lint, test**

```bash
pnpm install
pnpm run build
pnpm run lint
pnpm test
```
Expected: all PASS, `dist/` + `dist/404.html` produced.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "ci: GitHub Pages deploy workflow + docs cleanup"
```

---

## Self-Review Notes (coverage check)

- **pnpm + latest no-CVE packages** → Tasks 1–3, 17 (fresh installs pull current majors; `pnpm audit` can be run as a final check — add `pnpm audit --prod` to Step 5 of Task 18 if you want a hard gate).
- **shadcn + Tailwind v4, all components** → Tasks 2–3.
- **Four trainers, full parity** → PLL (11), COLL (12), Cross (13), ZBLL (14–16).
- **Preserved core** → data + hooks (4), cube logic + tests (5).
- **Dark mode / theme** → Task 6.
- **GitHub Pages deploy** → Task 18; base path wired in Task 2 (`vite base`) + Task 9 (`router basename`) + `404.html` (Task 2 postbuild).
- **Resolved during planning (no longer open):** `@/data/coll` confirmed to export `collMap` (default) + `collGroups, collAlgs, ollGroups, ollAlgs`; the ZBLL `AlgGroup`/`ZbllCase`/`CaseSelector`/`SessionHistory` originals were read in full and their exact structure (single-tile AlgGroup, count-badge math, solve-detail SessionHistory, drill-down state machine) is encoded directly in Tasks 14–16.
- **Only genuine runtime-verify points left for the implementer:** (1) whether the installed shadcn `dialog.tsx` exposes `showCloseButton` (Task 15 note covers the fallback); (2) that the live `visualcube.php` `stage` values (`oll`, `coll`, `zbll`, `cross-x2`, `ll`) still render — they are carried over unchanged from the working original.
