# memeroulette

Spin a roulette and let fate randomly pick a meme from a category.

A fully client-side (no backend) single-page app built with **Vue 3 + TypeScript +
Vite**, managed with **pnpm**, and deployed to **GitHub Pages**.

Memes are sourced from the free [justmeme.wtf API](https://justmeme.wtf/api-docs)
(no API key, CORS-enabled). The provider layer is abstracted so more sources can be
added later.

## Flow

1. Choose a **provider**.
2. Choose a **category** (loaded live from the provider).
3. **Spin** the wheel — it decelerates and lands on the winning meme.

## Requirements

- Node.js 20+
- pnpm (`corepack enable` or install manually)

## Development

```bash
pnpm install     # install dependencies
pnpm dev         # start the dev server (http://localhost:5173/memeroulette/)
pnpm test        # run unit tests (Vitest)
pnpm typecheck   # type-check with vue-tsc
pnpm build       # type-check + production build into dist/
pnpm preview     # preview the production build locally
```

## Project structure

```
src/
  main.ts                    app entry
  App.vue                    top-level flow + state (provider -> category -> spin)
  types.ts                   Meme, Category, MemeProvider interfaces
  providers/
    index.ts                 provider registry
    justmeme.ts              JustMemeProvider (justmeme.wtf)
    justmeme.test.ts         provider mapping/error tests
  lib/
    picker.ts                pickRandom / shuffle (pure, testable)
    picker.test.ts           picker unit tests
  components/
    ProviderSelect.vue
    CategorySelect.vue
    RouletteWheel.vue        SVG wheel + spin animation
    MemeReveal.vue           winning meme display
  styles.css
```

The wheel animation is purely visual: the winner is chosen by the pure `pickRandom`
function and the wheel is rotated to land on it, keeping result logic deterministic
and unit-testable.

## Adding a provider

Implement the `MemeProvider` interface (see `src/types.ts`) and register the instance
in `src/providers/index.ts`. No other changes are required.

## Local memes

The built-in **Local** provider serves images from `public/memes/<category>/`:

```
public/memes/
  reaction/
    drake-hotline-bling.svg
  animals/
    grumpy-cat.svg
```

Each first-level directory is a category and each image inside it is a meme;
display names are derived from the directory/file names. Supported extensions:
`png, jpg, jpeg, gif, webp, avif, svg`.

The registry is generated at build time by the `local-memes` Vite plugin
(`plugins/local-memes.ts`) and consumed via the `virtual:local-memes` module, so
no registry file is committed. During `pnpm dev`, adding or removing files
reloads the app automatically.

## Deployment (GitHub Pages)

Deployment is automated via `.github/workflows/deploy.yml` on every push to `main`.

One-time setup: in the repository, go to **Settings → Pages → Build and deployment →
Source** and select **GitHub Actions**.

The app is served under the repo subpath, so `vite.config.ts` sets
`base: '/memeroulette/'`. If you rename the repository, update `base` accordingly.

Published URL: `https://<username>.github.io/memeroulette/`
