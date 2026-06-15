import '@testing-library/jest-dom/vitest';

// jsdom does not implement matchMedia, which next-themes (and other UI libs)
// call to detect the system color scheme. Provide a no-op polyfill so
// components that read prefers-color-scheme can render under the test env.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
