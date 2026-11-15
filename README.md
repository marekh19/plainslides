# plainslides

[![Tests](https://github.com/marekh19/plainslides/actions/workflows/test.yml/badge.svg)](https://github.com/marekh19/plainslides/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/marekh19/plainslides/branch/main/graph/badge.svg)](https://codecov.io/gh/marekh19/plainslides)
[![npm version](https://img.shields.io/npm/v/plainslides.svg)](https://www.npmjs.com/package/plainslides)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

HTML slide decks that AI agents can build.

plainslides is a headless TypeScript library for HTML slide decks.

The library provides behavior: keyboard, click, swipe, and URL navigation, step reveals, slide transitions, stage scaling, a presenter window with notes and a pace clock, an overview, themes, fullscreen, and print. You or your agent write all markup and styles. The library writes its state to data attributes, ARIA attributes, and CSS custom properties, and your CSS styles them.

A deck is one HTML file and one script file. It works when opened from disk, with no server and no network. The library has no runtime dependencies and is under 12 kB minified and gzipped.

## Supported browsers

The current and the previous major version of Chrome, Firefox, and Safari.

## Install

Download a pinned version of the browser build and save it next to your HTML file:

```sh
curl -L -o plainslides.iife.js https://cdn.jsdelivr.net/npm/plainslides@0.1.0/dist/index.iife.js
```

Or install it for a bundler:

```sh
npm install plainslides
```

## Example

```html
<main data-deck>
  <section data-slide data-duration="45" data-section="Intro">
    <h1>Agents are users now</h1>
    <ul>
      <li data-step>First point</li>
      <li data-step>Second point</li>
    </ul>
    <aside data-notes><p>Mention the March numbers.</p></aside>
  </section>
  <!-- more slides -->
</main>

<script src="plainslides.iife.js"></script>
<script>PlainSlides.start()</script>
```

Load the file with a plain `<script src>`. Chrome blocks `<script type="module" src>` from `file://`.

With a bundler:

```ts
import { start } from 'plainslides'

const deck = start()
deck.on('change', ({ index }) => console.log(index))
```

Default keys: arrows, Space, Enter, Page Up and Page Down to navigate; `O` overview, `N` notes, `S` presenter window, `T` theme, `F` fullscreen, `R` restart timer, `?` key help.

## Documentation

- [Agent guide](docs/agent-guide.md): the complete reference, with the markup contract, options, API, 20 recipes, and a checklist. Give this file to your agent.
- [Starter deck](examples/starter/): a complete example with every recipe. Run `pnpm build` first; it copies `plainslides.iife.js` into the folder.
- [llms.txt](llms.txt): an index for language models.

## Development

The repository uses pnpm and the Node version in `.nvmrc`.

| Command | What it does |
|---|---|
| `pnpm build` | Builds ESM and IIFE bundles and type declarations into `dist/`, writes `dist/structure.css` and `dist/layout.css`, and copies the IIFE build into the starter example. |
| `pnpm dev` | Rebuilds on change. |
| `pnpm test` | Runs the unit tests with Vitest and type checks. |
| `pnpm test:coverage` | Runs the unit tests with coverage. |
| `pnpm test:browser` | Runs the Playwright tests against the starter example from `file://` in Chromium, Firefox, and WebKit. |
| `pnpm test:size` | Checks the size budget with size-limit. |
| `pnpm test:ci` | Type checks the tests, runs the unit tests, and checks the size. |
| `pnpm typecheck` | Type checks the source. |
| `pnpm lint:check`, `pnpm lint:fix` | Lints with oxlint. |
| `pnpm format:check`, `pnpm format:fix` | Formats with oxfmt. |
| `pnpm knip` | Finds unused files, exports, and dependencies. |
| `pnpm changeset` | Records a change for the next release. |

## License

MIT
