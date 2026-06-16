import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { ReactElement } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import Home from '@/routes/home';
import PllRecognitionTrainer from '@/routes/pll';
import CollRecognitionTrainer from '@/routes/coll';
import CrossTrainer from '@/routes/cross';
import ZbllTrainer from '@/routes/zbll';
import OllTrainer from '@/routes/oll';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

// Mount a route component inside a real router + theme context and assert it
// renders without throwing. createMemoryRouter gives the components the data
// router context their Link/useNavigate hooks expect, without touching the URL.
function renderRoute(element: ReactElement) {
  const router = createMemoryRouter([{ path: '/', element }], {
    initialEntries: ['/'],
  });
  return render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <RouterProvider router={router} />
    </ThemeProvider>,
  );
}

describe('route render smoke tests', () => {
  it('renders Home without throwing', () => {
    expect(() => renderRoute(<Home />)).not.toThrow();
  });

  it('renders PLL recognition trainer without throwing', () => {
    expect(() => renderRoute(<PllRecognitionTrainer />)).not.toThrow();
  });

  it('renders COLL recognition trainer without throwing', () => {
    expect(() => renderRoute(<CollRecognitionTrainer />)).not.toThrow();
  });

  it('renders Cross trainer without throwing', () => {
    expect(() => renderRoute(<CrossTrainer />)).not.toThrow();
  });

  it('renders ZBLL trainer with empty case selection without throwing', () => {
    // Default state: no selected cases in localStorage → cases is empty.
    // The trainer must guard against this rather than crash.
    expect(() => renderRoute(<ZbllTrainer />)).not.toThrow();
  });

  it('renders ZBLL trainer with a non-empty case selection without throwing', () => {
    window.localStorage.setItem(
      '@cubing-tools/zbll-trainer/selected-cases',
      JSON.stringify({ 'H/BBFF/AsA': true }),
    );
    expect(() => renderRoute(<ZbllTrainer />)).not.toThrow();
  });

  it('renders OLL trainer without throwing', () => {
    expect(() => renderRoute(<OllTrainer />)).not.toThrow();
  });

  it('renders OLL trainer with a stored deck without throwing', () => {
    window.localStorage.setItem(
      '@cubing-tools/oll-trainer',
      JSON.stringify({ '21': { data: { number: 21 }, deficiency: 2 } }),
    );
    expect(() => renderRoute(<OllTrainer />)).not.toThrow();
  });
});
