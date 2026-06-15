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
