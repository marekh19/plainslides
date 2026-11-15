# plainslides agent guide

This guide tells an AI agent how to build an HTML slide deck with `plainslides`. It is self-contained. Read it once, then write one HTML file.

The library provides behavior: navigation, step reveals, slide transitions, scaling, presenter tools, timing, and modes. You provide all markup and all visual styles. The library writes its state to data attributes, ARIA attributes, and CSS custom properties. Your CSS styles and animates those.

A finished deck is a folder with two or three files:

```
deck/
  index.html       your slides
  plainslides.iife.js   the library
  example.css      your styles (optional; you can also use a <style> element)
```

The person opens `index.html` from disk. No server and no network are needed.

## 1. Supported browsers

The library supports the current and the previous major version of Chrome, Firefox, and Safari. It uses recent platform features such as CSS `zoom`, `inert`, `:where()`, and `Element.getAnimations()`. Do not add polyfills.

## 2. Download the library

Download a pinned version of the IIFE build and save it next to `index.html`:

```sh
curl -L -o plainslides.iife.js https://cdn.jsdelivr.net/npm/plainslides@0.1.0
```

Replace `0.1.0` with the version you want. The package sets `unpkg` and `jsdelivr` to `dist/index.iife.js`, so the URL without a file path serves the IIFE build.

Rules:

- Load the library with a plain `<script src="plainslides.iife.js"></script>`.
- Never use `<script type="module" src>`. Chrome blocks module scripts from `file://`.
- Never link the CDN URL from the deck. Download the file, so the deck works offline.
- The IIFE build defines one global: `PlainSlides`.

Bundler users can install the package and import it:

```sh
npm install plainslides
```

```ts
import { start } from 'plainslides'
import 'plainslides/layout.css' // optional; start() injects it anyway
```

## 3. The minimal deck

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>My talk</title>
    <style>
      body { margin: 0; overflow: hidden; background: #fff; }
      [data-slide] { padding: 96px 120px; font-size: 32px; background: #fff; }
      [data-step-state='hidden'] { visibility: hidden; }
    </style>
  </head>
  <body>
    <main data-deck>
      <section data-slide data-duration="45" data-section="Why first-class">
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
  </body>
</html>
```

Call `PlainSlides.start()` after the deck markup, for example in a script at the end of `<body>`. `start()` throws an error when it finds no `[data-deck]` element.

The fastest start is to copy `examples/starter/` from the repository. It shows every recipe, step reveals, transitions, the overview, the notes panel, the help bar, and light and dark themes.

## 4. Markup contract

### Attributes you write

| Attribute | On | Meaning |
|---|---|---|
| `data-deck` | root element | The deck. One per page. Use `<main data-deck>`. |
| `data-width`, `data-height` | root, optional | Canvas size in CSS pixels. Default 1600 and 900. The `start()` options `width` and `height` override them. |
| `data-slide` | direct child of the root | One slide. Only direct children count. The library adds no wrapper elements. |
| `id` | slide, optional | Used in the URL hash instead of the slide number. |
| `data-title` | slide, optional | Slide title. Fallbacks: the first `h1` or `h2`, then `[data-role="eyebrow"]`, then "Slide N". Headings inside `[data-notes]` do not count. |
| `data-duration` | slide, optional | Target time in seconds. Used by the timer and pace. |
| `data-section` | slide, optional | Section name. Slides with the same value form one section. |
| `data-subsection` | slide, optional | Second level inside a section, for example "Find" inside "Six motions". |
| `data-notes` | element inside a slide | Speaker notes. The library keeps the HTML. It is always hidden in the slide. |
| `data-step` | element inside a slide | Step reveal. An optional integer value sets the order. See "Step reveals". |
| `data-transition` | root or slide, optional | Transition name, for example `fade` or `slide`. A slide value overrides the root value for transitions into that slide. `none` turns the transition off. Your CSS defines what a name looks like. |
| `data-widget="name"` | element inside a slide | Mount point for a registered widget, such as a chart. |
| `data-layout`, `data-push`, `data-grow` | any element | Layout helpers. See "Layout helpers". |
| `data-role="..."` | any content element | Semantic role used by recipes: `eyebrow`, `title`, `lead`, `kicker`, `hero`, `quote`, `cite`, `tag`, `stat`, `stat-value`, `stat-label`. The library reads only `eyebrow` (title fallback). |
| `data-deck-ignore` | any element | Clicks and swipes that start inside this element do not navigate. |

### Bindings the library fills

Bindings are elements you write anywhere in the page. The library sets their text or state. You control their markup and styles.

| Attribute | Library behavior |
|---|---|
| `data-deck-page` | Text, default format `3 / 22` (1-based). Inside a slide, it shows that slide's number. Outside slides, it shows the current number. Change the format with the `bindings.pageFormat` option. |
| `data-deck-progress` | Sets `--deck-progress` (0 to 1), `role="progressbar"`, `aria-valuemin="1"`, `aria-valuemax` (slide count), `aria-valuenow` (current number), and `aria-valuetext` ("Slide 3 of 22"). |
| `data-deck-section` | Text: the section name. Inside a slide, that slide's section. Outside slides, the current section. |
| `data-deck-tracker` | A container with items that carry `data-deck-tracker-item="Section name"`. Each item gets `data-state` (`past`, `current`, or `future`). The item that matches the section or subsection gets `aria-current="step"`. Inside a slide, the tracker shows that slide's position. |
| `data-deck-agenda` | Same behavior as `data-deck-tracker`. Use it for an agenda slide. |
| `data-deck-clock` | Text: elapsed time `mm:ss`, or `h:mm:ss` from one hour. |
| `data-deck-pace` | Text: "On pace", "1:20 behind", or "0:40 ahead". Also sets `data-pace` to `on`, `behind`, or `ahead`. Empty when no slide has `data-duration`. |
| `data-deck-notes-panel` | The in-page notes panel. The library sets `hidden` on it while notes mode is off. When it is visible, the stage shrinks by its height. Place it at the bottom of the window. |
| `data-deck-notes-text` | Receives a copy of the current slide's notes HTML. |
| `data-deck-next-title` | Text: the next slide's title. Empty on the last slide. |
| `data-deck-keys` | The library renders the key list from the keymap. In a `ul` or `ol` it renders `li` items, otherwise `span` items. Each item has `data-deck-key="command"`, one `<kbd>` per key, and a `<span>` with the label. |
| `data-deck-autohide` | Gets `data-idle` after 4000 ms without pointer movement. Pointer movement removes it. |

### State the library writes

On the root `[data-deck]`:

- `data-index` (1-based) and `data-count`.
- `data-direction`: `forward` or `backward`, the direction of the last slide change.
- `data-transitioning` while a slide transition runs.
- `data-mode-<name>` while a mode is on: `data-mode-overview`, `data-mode-notes`, `data-mode-presenter`, `data-mode-help`, `data-mode-print`.
- `data-printing` while the browser prints.
- `aria-roledescription="slide deck"` and `tabindex="-1"` (when the root has no `tabindex`).
- CSS variables: `--deck-width` and `--deck-height` (with `px`), `--deck-count`, `--deck-index` (1-based), `--deck-progress` (0 to 1), `--deck-scale`, `--deck-x`, `--deck-y`, `--deck-thumb-scale`, `--deck-thumb-columns`, `--deck-overview-gap`.

On each slide:

- `data-state`: `past`, `active`, or `future`.
- `data-entering` on the incoming slide and `data-leaving` on the outgoing slide while a transition runs. The value is the transition name.
- `aria-current="true"` on the active slide.
- `role="group"`, `aria-roledescription="slide"`, `aria-label="3 of 22: Title"`.
- `inert` on every slide that is not active, outside overview mode. A leaving slide is also inert.
- `--slide-index` (1-based).

On each step:

- `data-step-state`: `hidden`, `visible`, or `current`. `current` marks the most recently revealed group. In overview and print modes every step is `visible`.
- `aria-hidden="true"` and `inert` while hidden.
- `--step-index`: the 1-based position of its group.

On `<html>`: `data-theme` from the theme plugin.

The library also adds a visually hidden live region (`[data-deck-live]`) at the end of `<body>`. It announces "Slide 3 of 22: Title" on each slide change. It does not announce steps.

## 5. Canvas size

Slides are drawn on a fixed canvas of 1600 by 900 CSS pixels. The `fit` plugin scales the canvas to the window and centers it. Write all sizes in canvas pixels: for example `font-size: 32px` for body text and `104px` for a title.

Change the canvas size with attributes:

```html
<main data-deck data-width="1920" data-height="1080">
```

Or with options, which win over the attributes:

```js
PlainSlides.start({ width: 1200, height: 900 })
```

Your CSS can use `var(--deck-width)` and `var(--deck-height)`.

## 6. Default keys

| Keys | Command | Label |
|---|---|---|
| Right, Down, Page Down, Space, Enter | `next` | Next |
| Left, Up, Page Up, Backspace, Shift+Space | `prev` | Previous |
| Home | `first` | First slide |
| End | `last` | Last slide |
| `O` | `overview` | Overview |
| `N` | `notes` | Speaker notes |
| `S` | `presenter` | Presenter view |
| `R` | `timer-reset` | Restart timer |
| `T` | `theme` | Theme |
| `F` | `fullscreen` | Fullscreen |
| `?` | `help` | Keyboard help (toggles `data-mode-help`) |

The keyboard handler ignores:

- keys pressed with Ctrl, Meta, or Alt,
- keys during text composition,
- keys typed in `input`, `textarea`, `select`, or `contenteditable` elements,
- Space, Shift+Space, and Enter on a focused link, button, `summary`, `video`, `audio`, or `[role="button"]`,
- events that another handler already cancelled with `preventDefault()`.

Change keys with options. Each plugin takes a `key` option (`false` removes the key). The `keyboard` plugin takes `keys` per command and `help`:

```js
PlainSlides.start({
  keyboard: { keys: { next: ['ArrowRight', 'Space'] }, help: 'h' },
  overview: { key: 'g' },
  fullscreen: { key: false },
})
```

Key names follow `KeyboardEvent.key`, with `Space` for the space bar, lower-case letters, and a `Shift+` prefix for named keys. The help list (`data-deck-keys`) and `deck.keymap.list()` come from the same keymap, so the help text always matches the keys.

Click zones: a click in the left third of the stage goes back, a click anywhere else goes forward. A horizontal swipe on a touch screen of at least 50 px also navigates. Clicks and swipes on links, buttons, form fields, `label`, `summary`, `video`, `audio`, `pre`, `code`, `[contenteditable]`, and `[data-deck-ignore]` do not navigate. A click that ends a text selection does not navigate. The mouse wheel does not navigate.

## 7. Step reveals

Mark elements with `data-step` to reveal them one group at a time.

- `next` reveals the next group. When all groups are visible, `next` moves to the next slide, which starts with no groups revealed.
- `prev` hides the most recent group. When no groups are visible, `prev` moves to the previous slide, which shows all its groups.
- Steps with the same integer value form one group and appear together.
- A step without a value gets the next number after the highest number before it in document order. So `[data-step] [data-step] [data-step="5"] [data-step]` gives groups 1, 2, 5, 6. Groups appear in ascending order.
- A `data-step` element inside another `data-step` element is allowed. It is only visible after both are revealed.
- The URL hash records the step when it is not 0, for example `#3.2`.

The library only sets `data-step-state`. Your CSS must hide hidden steps. Use `visibility: hidden` so the layout does not jump:

```css
[data-step-state='hidden'] { visibility: hidden; }
```

Steps that appear together:

```html
<li data-step="1">Appears first</li>
<li data-step="2">Appears second</li>
<li data-step="2">Also second</li>
```

See recipe 19 for fade-in, slide-up, and highlight patterns.

## 8. Slide transitions

The library manages transition state and timing. Your CSS defines what a transition looks like.

Sequence for a change from slide A to slide B:

1. The library picks the name: B's `data-transition`, otherwise the root's `data-transition`, otherwise none.
2. It sets `data-direction` and `data-transitioning` on the root. A gets `data-leaving="<name>"` and `inert`. B gets `data-state="active"` and `data-entering="<name>"`. Focus moves and the live region announces B at this point.
3. Your CSS runs `@keyframes` animations keyed on those attributes.
4. The library waits until all animations on A, B, and their descendants finish, or until `transitionTimeout` (default 1000 ms) passes.
5. It removes `data-leaving`, `data-entering`, and `data-transitioning`, and fires `settled`.

Rules:

- There is no transition when the name is `none` or missing, on the first render, in overview mode, while printing, and in presenter previews. Calls with `deck.go(n, { transition: false })` and the initial jump from the URL hash also skip it.
- If the user navigates during a transition, the library finishes the running animations at once and starts the next change. Holding an arrow key never queues changes.
- The library does not read `prefers-reduced-motion`. Wrap every animation in `@media (prefers-reduced-motion: no-preference)`. Without animations, the change completes at once.
- The leaving slide stays visible while it has `data-leaving`. Use `forwards` fill on leaving animations so the slide does not flash back.
- When a name runs no animation (and reduced motion is off), the library logs a warning once on `file://` and `localhost`.

See recipe 20 for `fade`, `slide`, `zoom`, `none`, and a per-slide override.

## 9. Layout helpers

`start()` injects unstyled layout helpers. They contain only layout properties: `display`, flex and grid settings, `gap`, and auto margins. Turn them off with `PlainSlides.start({ layout: false })`. Bundler users can import `plainslides/layout.css`; the file is also in `dist/layout.css`.

| Attribute | Effect |
|---|---|
| `data-layout="row"` | Flex row. |
| `data-layout="col"` | Flex column. |
| `data-layout="grid"` | Grid with `--cols` equal columns (default 2). |
| `data-layout="split"` | Two-column grid: `grid-template-columns: var(--split, 1fr 1fr)`. A 60/40 split is `style="--split: 6fr 4fr"`. |
| `data-layout="center"` | Grid that centers its content on both axes. |
| `data-layout="stack"` | All children in one grid cell, on top of each other. |
| `data-push` | `margin-block-start: auto`. Pins an element to the bottom of a column. |
| `data-grow` | `flex: 1` and `min-height: 0`. |

All layouts use `gap: var(--gap, 1em)`. Set `--gap` on a slide or a layout element. All selectors use `:where()`, so any of your rules override them. Other `data-layout` values produce a validation warning.

## 10. Recipes

Recipes are markup patterns with example CSS. They are not library code. The example CSS uses these theme variables: `--bg`, `--surface`, `--text`, `--muted`, `--accent`, `--line` (see "Theming"). `examples/starter/` contains every recipe.

### Recipe 1: title slide and closing slide

Use it for the first and last slide.

```html
<section data-slide data-section="Introduction" class="slide-title" data-layout="col">
  <p data-role="eyebrow">Starter deck</p>
  <h1 data-role="title">Slides that agents can build</h1>
  <p data-role="lead">One HTML file, one script, no server.</p>
  <p data-push data-role="kicker">Press <kbd>?</kbd> for keys</p>
</section>
```

```css
.slide-title { justify-content: center; }
[data-role='eyebrow'] { color: var(--accent); font-size: 28px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
[data-role='lead'] { color: var(--muted); font-size: 40px; }
```

### Recipe 2: agenda generated from sections

Use it to show the talk structure. Each item names a `data-section` value. The library marks past, current, and future items.

```html
<section data-slide data-section="Introduction" data-layout="col">
  <h2>Agenda</h2>
  <ol data-deck-agenda class="agenda">
    <li data-deck-tracker-item="Introduction">Introduction</li>
    <li data-deck-tracker-item="Numbers">Numbers</li>
    <li data-deck-tracker-item="Wrap-up">Wrap-up</li>
  </ol>
</section>
```

```css
.agenda { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; font-size: 44px; }
.agenda li[data-state='current'] { color: var(--accent); }
```

### Recipe 3: section tracker, large and small

Use the large variant on a section divider slide and the small variant at the top of content slides. Copy the same list onto each slide; the library computes the state from the slide that contains it.

```html
<ol data-deck-tracker class="tracker tracker-small">
  <li data-deck-tracker-item="Introduction">Introduction</li>
  <li data-deck-tracker-item="Numbers">Numbers</li>
  <li data-deck-tracker-item="Wrap-up">Wrap-up</li>
</ol>
```

```css
.tracker { display: flex; gap: 8px; list-style: none; margin: 0; padding: 0; }
.tracker li { flex: 1; border-top: 6px solid var(--line); padding-top: 12px; color: var(--muted); }
.tracker li[data-state='past'] { border-color: var(--muted); }
.tracker li[data-state='current'] { border-color: var(--accent); color: var(--text); }
.tracker-small { font-size: 20px; }
.tracker-large { width: 100%; font-size: 30px; }
```

Items can also name a `data-subsection` value.

### Recipe 4: stat grid

Use it for two to four key numbers.

```html
<div data-layout="grid" style="--cols: 3">
  <div data-role="stat" data-step>
    <span data-role="stat-value">22</span>
    <span data-role="stat-label">slides in the source deck</span>
  </div>
  <!-- more stats -->
</div>
```

```css
[data-role='stat'] { display: flex; flex-direction: column; gap: 8px; padding: 32px; border-radius: 16px; background: var(--surface); }
[data-role='stat-value'] { color: var(--accent); font-size: 96px; font-weight: 700; line-height: 1; }
[data-role='stat-label'] { color: var(--muted); }
```

### Recipe 5: hero number with explanation and chart

Use it for one number that carries the slide.

```html
<section data-slide data-layout="split" style="--split: 5fr 4fr">
  <div data-layout="col">
    <p data-role="eyebrow">Hero number</p>
    <p data-role="hero">3x</p>
    <p data-role="lead">Faster deck builds when the agent reads one guide.</p>
  </div>
  <figure data-widget="bars" data-values="Hand-written:9,With library:3"
    aria-label="Bar chart, build time in minutes: hand-written 9, with library 3."></figure>
</section>
```

```css
[data-role='hero'] { color: var(--accent); font-size: 280px; font-weight: 800; line-height: 1; }
```

### Recipe 6: quote with citation

```html
<section data-slide data-title="Quote" data-layout="center">
  <blockquote data-role="quote">
    <p>The best interface for an agent is a short, complete contract.</p>
    <footer data-role="cite">A starter deck</footer>
  </blockquote>
</section>
```

```css
[data-role='quote'] { max-width: 1200px; margin: 0; font-size: 64px; line-height: 1.2; }
[data-role='cite'] { margin-top: 32px; color: var(--muted); font-size: 32px; }
```

A quote slide has no heading, so give it `data-title`.

### Recipe 7: card grid with tags

Use it for three to six parallel items.

```html
<div data-layout="grid" style="--cols: 3">
  <article class="card">
    <span data-role="tag">Core</span>
    <h3>Navigation</h3>
    <p>Keys, clicks, swipes, and the URL hash.</p>
  </article>
  <!-- more cards -->
</div>
```

```css
.card { display: flex; flex-direction: column; gap: 16px; padding: 40px; border: 2px solid var(--line); border-radius: 16px; }
[data-role='tag'] { align-self: start; padding: 4px 14px; border-radius: 999px; background: var(--surface); color: var(--accent); font-size: 22px; }
```

### Recipe 8: numbered steps

Use an ordered list with CSS counters for a process.

```html
<ol class="numbered">
  <li data-step>Write the slides as HTML sections.</li>
  <li data-step>Add data attributes for time, sections, and steps.</li>
  <li data-step>Call <code>PlainSlides.start()</code>.</li>
</ol>
```

```css
.numbered { display: grid; gap: 28px; margin: 0; padding: 0; list-style: none; counter-reset: step; font-size: 44px; }
.numbered li { counter-increment: step; display: flex; gap: 32px; align-items: baseline; }
.numbered li::before { content: counter(step); color: var(--accent); font-weight: 700; }
```

### Recipe 9: vertical flow with connectors

Use it for a sequence of stages.

```html
<ol class="flow">
  <li>Person asks an agent for a deck</li>
  <li>Agent reads the guide</li>
  <li>Person presents</li>
</ol>
```

```css
.flow { display: grid; gap: 40px; margin: 0; padding: 0; list-style: none; }
.flow li { position: relative; width: fit-content; padding: 20px 32px; border: 2px solid var(--line); border-radius: 12px; }
.flow li + li::before { content: ''; position: absolute; left: 48px; top: -42px; height: 40px; border-left: 3px solid var(--accent); }
```

### Recipe 10: tree with right-aligned metadata

Use it for file trees or hierarchies with a value per row.

```html
<ul class="tree">
  <li><span>deck/</span><span>folder</span></li>
  <li class="tree-child"><span>index.html</span><span>12 kB</span></li>
</ul>
```

```css
.tree { margin: 0; padding: 0; list-style: none; font-family: ui-monospace, Menlo, monospace; max-width: 900px; }
.tree li { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--line); }
.tree li span:last-child { color: var(--muted); }
.tree-child { padding-left: 48px !important; }
```

### Recipe 11: terminal block

Use it for commands and their output. Clicks inside `pre` and `code` do not navigate, so the audience can select text.

```html
<pre class="terminal"><code><span data-role="prompt">$</span> <span data-role="command">npm install plainslides</span>
<span data-role="output">added 1 package</span></code></pre>
```

```css
.terminal { margin: 0; padding: 40px; border-radius: 16px; background: #05070a; color: #e8eaed; font-size: 26px; white-space: pre-wrap; }
.terminal [data-role='prompt'] { color: #7cc4ff; }
.terminal [data-role='output'] { color: #a3a9b4; }
```

### Recipe 12: key-value comparison list

```html
<dl class="kv">
  <div><dt>Navigation</dt><dd>Built in</dd></div>
  <div><dt>Styles</dt><dd>Yours</dd></div>
</dl>
```

```css
.kv { display: grid; margin: 0; }
.kv div { display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid var(--line); }
.kv dt { color: var(--muted); }
.kv dd { margin: 0; font-weight: 600; }
```

### Recipe 13: data table

Use a real `<table>` with a `caption` and `th scope`. Never build a table from `div` elements.

```html
<table class="data">
  <caption>Keys by command</caption>
  <thead><tr><th scope="col">Command</th><th scope="col">Key</th></tr></thead>
  <tbody><tr><td>Overview</td><td>O</td></tr></tbody>
</table>
```

```css
.data { border-collapse: collapse; font-size: 32px; }
.data caption { text-align: left; color: var(--muted); padding-bottom: 16px; }
.data th, .data td { padding: 16px 48px 16px 0; border-bottom: 1px solid var(--line); text-align: left; }
```

### Recipe 14: takeaways with large counters

```html
<ol class="takeaways">
  <li>The library owns behavior.</li>
  <li>Your CSS owns the look.</li>
</ol>
```

```css
.takeaways { display: grid; gap: 24px; margin: 0; padding: 0; list-style: none; counter-reset: takeaway; font-size: 48px; }
.takeaways li { counter-increment: takeaway; display: flex; gap: 40px; align-items: center; }
.takeaways li::before { content: counter(takeaway); color: var(--accent); font-size: 96px; font-weight: 800; line-height: 1; }
```

### Recipe 15: bottom-pinned conclusion

Put `data-push` on the last element of a column layout. It moves to the bottom of the slide.

```html
<section data-slide data-layout="col">
  <h2>Takeaways</h2>
  <ol class="takeaways">...</ol>
  <p data-push class="conclusion">Start from this folder.</p>
</section>
```

```css
.conclusion { padding-top: 24px; border-top: 2px solid var(--line); color: var(--accent); font-size: 40px; }
```

### Recipe 16: footer rail with source and page number

`data-deck-page` inside a slide shows that slide's own number, also in overview and print.

```html
<footer data-push data-layout="row" class="rail">
  <span>Source: starter example</span>
  <span data-deck-page></span>
</footer>
```

```css
.rail { justify-content: space-between; color: var(--muted); font-size: 22px; }
```

### Recipe 17: two-column split

```html
<div data-layout="split" style="--split: 6fr 4fr">
  <div>Left, 60%</div>
  <div>Right, 40%</div>
</div>
```

No CSS is needed beyond the layout helpers.

### Recipe 18: custom chart widget

The library ships no charts. Write a small widget and register it in `start()`. Put the full data in the figure's `aria-label`, so the chart needs no other text alternative, and mark the SVG `aria-hidden="true"`.

```html
<figure data-widget="bars" data-values="Hand-written:9,With library:3"
  aria-label="Bar chart, build time in minutes: hand-written 9, with library 3."
  class="chart"></figure>

<script src="plainslides.iife.js"></script>
<script>
  const bars = {
    mount(element) {
      const ns = 'http://www.w3.org/2000/svg'
      const rows = element.dataset.values.split(',').map((pair) => {
        const [label, value] = pair.split(':')
        return { label, value: Number(value) }
      })
      const max = Math.max(...rows.map((row) => row.value))
      const svg = document.createElementNS(ns, 'svg')
      svg.setAttribute('viewBox', `0 0 400 ${rows.length * 60}`)
      svg.setAttribute('aria-hidden', 'true')
      rows.forEach((row, index) => {
        const bar = document.createElementNS(ns, 'rect')
        bar.setAttribute('x', '140')
        bar.setAttribute('y', String(index * 60 + 10))
        bar.setAttribute('height', '36')
        bar.setAttribute('width', String((row.value / max) * 240))
        bar.setAttribute('class', 'bar')
        const text = document.createElementNS(ns, 'text')
        text.setAttribute('x', '0')
        text.setAttribute('y', String(index * 60 + 34))
        text.textContent = row.label
        svg.append(bar, text)
      })
      element.replaceChildren(svg)
      return () => element.replaceChildren()
    },
  }
  PlainSlides.start({ widgets: { bars } })
</script>
```

```css
.chart { margin: 0; align-self: center; }
.chart svg { width: 100%; font-size: 22px; fill: var(--text); }
.chart .bar { fill: var(--accent); }
```

Use CSS variables for colors, so the chart follows the theme without re-rendering. See "Writing a widget" for the widget context.

### Recipe 19: step reveals

Build a list one item at a time with fade-in and slide-up:

```css
[data-step-state='hidden'] { visibility: hidden; }
@media (prefers-reduced-motion: no-preference) {
  [data-step-state='current'] { animation: step-in 300ms ease-out; }
}
@keyframes step-in {
  from { opacity: 0; translate: 0 24px; }
}
```

Highlight the current item and dim earlier items:

```html
<ol class="numbered focus-steps">
  <li data-step>First</li>
  <li data-step>Second</li>
</ol>
```

```css
.focus-steps [data-step-state='visible'] { opacity: 0.45; }
```

Stagger items that appear together with your own index variable. `--step-index` is the same for every item in a group, so it cannot stagger them:

```html
<li data-step="2" style="--i: 0">One</li>
<li data-step="2" style="--i: 1">Two</li>
```

```css
[data-step-state='current'] { animation-delay: calc(var(--i, 0) * 80ms); }
```

### Recipe 20: slide transitions

Set a default on the root and override it per slide:

```html
<main data-deck data-transition="fade">
  <section data-slide>...</section>                         <!-- fade -->
  <section data-slide data-transition="slide">...</section> <!-- slide -->
  <section data-slide data-transition="zoom">...</section>  <!-- zoom -->
  <section data-slide data-transition="none">...</section>  <!-- instant -->
</main>
```

The value on slide B applies to the change into B.

```css
@media (prefers-reduced-motion: no-preference) {
  [data-entering='fade'] { animation: fade-in 300ms ease-out; }
  [data-leaving='fade'] { animation: fade-out 300ms ease-in forwards; }

  [data-direction='forward'] [data-entering='slide'] { animation: slide-from-right 400ms ease-out; }
  [data-direction='forward'] [data-leaving='slide'] { animation: slide-to-left 400ms ease-in forwards; }
  [data-direction='backward'] [data-entering='slide'] { animation: slide-from-left 400ms ease-out; }
  [data-direction='backward'] [data-leaving='slide'] { animation: slide-to-right 400ms ease-in forwards; }

  [data-entering='zoom'] { animation: zoom-in 400ms ease-out; }
  [data-leaving='zoom'] { animation: fade-out 200ms ease-in forwards; }
}
@keyframes fade-in { from { opacity: 0; } }
@keyframes fade-out { to { opacity: 0; } }
@keyframes slide-from-right { from { translate: 100% 0; } }
@keyframes slide-to-left { to { translate: -100% 0; } }
@keyframes slide-from-left { from { translate: -100% 0; } }
@keyframes slide-to-right { to { translate: 100% 0; } }
@keyframes zoom-in { from { opacity: 0; scale: 0.9; } }
```

Give every slide a background (`[data-slide] { background: var(--bg); }`), because entering and leaving slides overlap in the same grid cell.

## 11. Theming

Define colors as CSS variables per theme. The `theme` plugin sets `data-theme` on `<html>`:

```css
:root, [data-theme='dark'] {
  --bg: #0f1115; --surface: #1a1d24; --text: #e8eaed;
  --muted: #a3a9b4; --accent: #7cc4ff; --line: #2d323c;
  color-scheme: dark;
}
[data-theme='light'] {
  --bg: #ffffff; --surface: #f2f4f7; --text: #16181d;
  --muted: #4b5260; --accent: #0a5cc2; --line: #d5d9e0;
  color-scheme: light;
}
html, body { margin: 0; height: 100%; background: var(--bg); color: var(--text); }
```

How the theme plugin picks the first theme:

1. A `data-theme` attribute already in the HTML wins.
2. Otherwise the choice stored in `localStorage` (key `plainslides-theme`).
3. Otherwise the system setting (`prefers-color-scheme`), when the theme list contains `dark` or `light`.
4. Otherwise the first theme in the list.

`T` cycles through the list (default `['dark', 'light']`) and stores the choice. Because an HTML attribute wins, do not write `data-theme` on `<html>` if the `T` choice should survive a reload.

Custom themes:

```js
PlainSlides.start({ theme: { themes: ['dark', 'light', 'brand'], storageKey: 'my-talk-theme' } })
```

## 12. Fonts

The deck must work offline. Use one of these:

- System fonts: `font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;`
- A local font file next to `index.html`: `@font-face { font-family: 'Talk'; src: url('talk.woff2') format('woff2'); }`
- A base64-embedded font: `src: url('data:font/woff2;base64,...') format('woff2');`

Never load fonts from Google Fonts or another font CDN.

## 13. Presenter window

`S` opens a presenter window. It shows the current slide with its current step state, the next step or next slide, the notes, the clock, the pace, and the slide number. The next-slide preview shows all its steps. Previews never run transitions.

How it works: the library opens a blank popup (`about:blank`) that shares the page's origin, also from `file://`. The main page builds the popup's content, copies every `<style>` and `<link rel="stylesheet">` into it, and keeps `data-theme` in sync. Keys pressed in the popup control the deck, except `F`: a browser allows fullscreen only for the window that received the key press, so press `F` in the main window. When the main page closes, the popup closes. When the popup closes, presenter mode turns off.

If the browser blocks the popup, the library turns on notes mode instead and logs a warning.

Limitation: reloading either window breaks the connection. Close the popup and press `S` again.

### Custom presenter layout

Add a `<template data-deck-presenter>` to the page. The library copies its content into the popup instead of the default layout. Use these attributes inside it:

| Attribute | Content |
|---|---|
| `data-deck-presenter-current` | Preview of the current slide. Give it a size; the preview scales to fit. |
| `data-deck-presenter-next` | Preview of the next step or slide. Gets `data-empty` on the last step of the last slide. |
| `data-deck-page` | Current page number. |
| `data-deck-section` | Current section. |
| `data-deck-clock` | Elapsed time. |
| `data-deck-pace` | Pace text and `data-pace`. |
| `data-deck-notes-text` | Notes HTML of the current slide. |
| `data-deck-next-title` | Title of the next slide. |

```html
<template data-deck-presenter>
  <div class="presenter">
    <div data-deck-presenter-current style="height: 60vh"></div>
    <div data-deck-presenter-next style="height: 30vh"></div>
    <p><span data-deck-page></span> <span data-deck-clock></span> <span data-deck-pace></span></p>
    <div data-deck-notes-text></div>
  </div>
</template>
```

With a custom template, the library adds no presenter layout CSS. Style it in your stylesheet; the popup body has `data-deck-presenter-window`. Each preview is a copy of the deck root (same tag, classes, and attributes, plus `data-deck-preview`) that contains one slide, so your slide selectors still match.

## 14. Accessibility

The library handles:

- slide semantics: `role="group"`, `aria-roledescription="slide"`, `aria-label`, `aria-current`,
- `inert` on inactive slides and hidden steps, plus `aria-hidden` on hidden steps,
- a live region that announces only "Slide N of M: Title",
- safe keyboard handling (see "Default keys"),
- focus: when the focused element ends up inside inert content, focus moves to the deck root,
- keyboard-operable overview thumbnails: each is a focusable button; Enter, Space, or a click opens it.

You must:

- Write one `h1` per slide at most, and give every slide a title (`data-title`, `h1`, `h2`, or an eyebrow).
- Give every image an `alt` attribute (`alt=""` for decoration).
- Give every `figure` an accessible name: a `figcaption` or an `aria-label` with the full data.
- Use real `<table>`, `<ol>`, `<ul>`, and `<blockquote>` elements.
- Check text contrast in every theme: 4.5:1 or more for normal text and accent text, 3:1 for text of 24px (canvas pixels) and larger. A light-theme accent such as `#3b82f6` on white fails; `#0a5cc2` passes.
- Wrap every animation in `@media (prefers-reduced-motion: no-preference)`.
- Keep a visible focus style, for example `:focus-visible { outline: 3px solid var(--accent); }`.
- Set `lang` on `<html>`.

## 15. Validation

On `file://` and `localhost`, `start()` runs `deck.validate()` and logs each issue with `console.warn`, prefixed with `[plainslides]`. Open the browser console after each change and fix every warning. You can also call `deck.validate()` on the deck that `start()` returns; it returns a list of `{ code, message, element? }`.

| Code | Problem |
|---|---|
| `no-slides` | The root has no `[data-slide]` children. |
| `size` | `data-width` or `data-height` is not a positive number. |
| `slide-title` | A slide has no `data-title`, `h1`, `h2`, or `[data-role="eyebrow"]`. |
| `duration` | `data-duration` is not a positive number. |
| `step-value` | `data-step` has a value that is not an integer. |
| `h1-count` | A slide has more than one `h1`. |
| `layout` | `data-layout` has an unknown value. |
| `tracker-item` | A `data-deck-tracker-item` matches no `data-section` or `data-subsection`. |
| `figure-name` | A `figure` inside the deck has no `figcaption`, `aria-label`, or `aria-labelledby`. |
| `img-alt` | An `img` inside the deck has no `alt` attribute. |
| `key-conflict` | One key is bound to more than one command. |
| `widget` | A `[data-widget]` names no registered widget. |

At runtime, the library also warns once when a transition name runs no animation, and when the browser blocks the presenter window.

Turn warnings on or off with `PlainSlides.start({ warnings: true })` or `false`.

## 16. Options

### `start()` options

Each plugin option takes an options object, or `false` to turn the plugin off.

| Option | Default | Meaning |
|---|---|---|
| `root` | `'[data-deck]'` | The deck root element or a selector. |
| `width`, `height` | `data-width`, `data-height`, then 1600 and 900 | Canvas size in CSS pixels. |
| `transitionTimeout` | `1000` | Maximum wait for a slide transition, in ms. |
| `injectStyles` | `true` | Injects the structural CSS. |
| `layout` | `true` | Injects the layout helper CSS. |
| `warnings` | on for `file://` and `localhost` | Logs validation issues and runtime warnings. |
| `widgets` | `{}` | Widgets by name. |
| `plugins` | `[]` | Extra plugins, installed after the default plugins. |
| `fit` | `{}` | See below. |
| `hash` | `{}` | See below. |
| `overview` | `{}` | See below. |
| `notes` | `{}` | See below. |
| `presenter` | `{}` | See below. |
| `timer` | `{}` | See below. |
| `theme` | `{}` | See below. |
| `fullscreen` | `{}` | See below. |
| `keyboard` | `{}` | See below. |
| `pointer` | `{}` | See below. |
| `autohide` | `{}` | See below. |
| `print` | on | Only `false` is accepted. |
| `bindings` | `{}` | See below. |

### Plugin options

| Plugin | Option | Default | Meaning |
|---|---|---|---|
| `fit` | `thumbWidth` | `320` | Target overview thumbnail width in CSS pixels. |
| `fit` | `overviewGap` | `16` | Space between and around overview thumbnails. |
| `hash` | `history` | `'replace'` | `'push'` adds a history entry per change, so the back button moves through slides. |
| `overview` | `key` | `'o'` | Key for overview. |
| `overview` | `auto` | `'(max-width: 760px)'` | Media query that turns overview on. `false` turns this off. |
| `notes` | `key` | `'n'` | Key for the notes panel. |
| `presenter` | `key` | `'s'` | Key for the presenter window. |
| `presenter` | `name` | `'plainslides-presenter'` | Window name, so the same popup is reused. |
| `presenter` | `features` | `'popup,width=1280,height=800'` | `window.open` features. |
| `timer` | `tolerance` | `15` | Seconds of difference that still count as on pace. |
| `timer` | `start` | `'first-navigation'` | `'load'` starts at once; `'manual'` starts only with the `timer-reset` command. |
| `timer` | `key` | `'r'` | Key that starts or restarts the clock. |
| `theme` | `themes` | `['dark', 'light']` | Themes in toggle order. |
| `theme` | `storageKey` | `'plainslides-theme'` | `localStorage` key. |
| `theme` | `key` | `'t'` | Key for the theme toggle. |
| `fullscreen` | `key` | `'f'` | Key for fullscreen. |
| `keyboard` | `keys` | see "Default keys" | Keys per command. Replaces the defaults for the commands you list. |
| `keyboard` | `help` | `'?'` | Key for the `help` mode. |
| `pointer` | `backZone` | `1/3` | Share of the width, from the left, that goes back. |
| `pointer` | `click` | `true` | Click zones. |
| `pointer` | `swipe` | `true` | Touch swipes. |
| `pointer` | `swipeThreshold` | `50` | Minimum swipe distance in CSS pixels. |
| `autohide` | `delay` | `4000` | Milliseconds without pointer movement before `data-idle`. |
| `bindings` | `pageFormat` | `(n, count) => \`${n} / ${count}\`` | Formats `data-deck-page`. `n` is 1-based. |

Every `key` option also accepts `false`, which removes the key but keeps the command.

Timer details: the clock starts on the first slide or step change. Pace compares elapsed time with the planned time at the middle of the current slide. The plan starts at the slide where the clock started, so the time you spend on the title slide before the first key press does not count. Slides without `data-duration` count as 0 seconds.

## 17. JavaScript API

`PlainSlides.start()` returns a `Deck`. All exports are also available on the `PlainSlides` global: `start`, `createDeck`, every plugin (`fit`, `hash`, `overview`, `notes`, `presenter`, `timer`, `theme`, `fullscreen`, `keyboard`, `pointer`, `autohide`, `print`, `bindings`, `widgets`), `handleKey`, `DEFAULT_KEYS`, `keyName`, `keyLabel`, `structureCss`, and `layoutCss`.

```ts
interface Deck {
  readonly root: HTMLElement
  readonly slides: readonly SlideInfo[]
  readonly index: number // 0-based in the API; 1-based in attributes, page numbers, and the URL
  readonly step: number // number of revealed step groups on the current slide
  readonly sections: readonly SectionInfo[]
  readonly transitioning: boolean
  readonly size: { width: number; height: number }

  go(target: number | string, options?: { step?: number | 'all'; transition?: boolean }): void
  next(): void
  prev(): void
  first(): void
  last(): void

  mode(name: string): boolean
  setMode(name: string, on: boolean): void
  toggleMode(name: string): void

  run(command: string): void
  readonly commands: CommandRegistry // register(name, { label, run }), get(name), list()
  readonly keymap: Keymap // bind(key, command), lookup(key), list(), conflicts()

  on(event, handler): () => void // returns an unsubscribe function
  emit(event, payload): void
  validate(): DeckIssue[]
  addCheck(check: () => DeckIssue[]): () => void
  warn(message: string): void
  use(plugin: Plugin): () => void
  destroy(): void
}
```

- `go` takes a 0-based index or a slide `id`. Out-of-range numbers clamp. An unknown `id` does nothing. Without `step`, the slide opens with no steps revealed.
- In overview mode, `next` and `prev` move by whole slides.
- `destroy()` removes every listener, interval, injected element, and attribute the library added, and restores the original values.

`SlideInfo` has `element`, `index`, `id`, `title`, `duration`, `section`, `subsection`, `transition`, `notes`, and `stepGroups`. `SectionInfo` has `name`, `start`, `end` (0-based slide indexes), and `subsections`.

### Events

| Event | Payload | When it fires |
|---|---|---|
| `change` | `{ index, step, previousIndex, previousStep, direction }` | After every position change: a new slide or a new step on the same slide. |
| `step` | `{ index, step, direction }` | Only when the step changes on the same slide. Fires after `change`. |
| `settled` | `{ index }` | Only after slide changes: when the transition finishes, or right after `change` when there is no transition. |
| `mode` | `{ name, on }` | When a mode turns on or off. |
| `tick` | timer state | Every second while the clock runs, and on each change. |
| `theme` | `{ theme }` | When the theme is applied. |
| `preview` | `{ element }` | When the presenter window renders a preview. |

The timer state has `running`, `startedAt`, `elapsed` (seconds), `plannedTotal`, `plannedUntilNow`, `pace` (`'on'`, `'behind'`, `'ahead'`, or undefined), and `delta` (seconds; positive means behind).

```js
const deck = PlainSlides.start()
deck.on('change', ({ index, step }) => console.log(index, step))
deck.go('summary', { step: 'all' })
```

### Writing a plugin

A plugin is a function that receives the deck and returns an optional cleanup function. Use only the public `Deck` API.

```js
const laserPointer = (deck) => {
  const off = deck.commands.register('laser', {
    label: 'Laser pointer',
    run: () => deck.toggleMode('laser'), // sets data-mode-laser on the root
  })
  const unbind = deck.keymap.bind('l', 'laser')
  return () => {
    unbind()
    off()
    deck.setMode('laser', false)
  }
}

PlainSlides.start({ plugins: [laserPointer] })
```

The new key appears in the `data-deck-keys` list automatically.

To build a deck without the defaults, use `createDeck` and pick plugins:

```js
const { createDeck, fit, keyboard, hash } = PlainSlides
const deck = createDeck(document.querySelector('[data-deck]'), {
  plugins: [fit(), hash(), keyboard()],
})
```

`createDeck` does not inject the layout helpers.

### Writing a widget

A widget is `{ mount(element, context) }`. `mount` returns an optional cleanup function. The context has:

- `deck`: the deck.
- `theme`: the current `data-theme` on `<html>`.
- `preview`: `true` when the widget mounts inside a presenter preview.
- `on(event, handler)`: like `deck.on`, but unsubscribes when the widget unmounts.

```js
const counter = {
  mount(element, { deck, on, preview }) {
    element.textContent = preview ? element.dataset.target : '0'
    if (preview) return
    return on('settled', ({ index }) => {
      if (deck.slides[index].element.contains(element)) {
        element.textContent = element.dataset.target
      }
    })
  },
}
PlainSlides.start({ widgets: { counter } })
```

Widgets mount once at start, and again inside each presenter preview. Use `settled` to animate after the slide has arrived, and `theme` to re-render on a theme change.

## 18. Structural CSS

The library injects a small stylesheet into `<style data-deck-styles>`. It contains only position, size, and visibility rules:

- The root is `position: fixed` at the top left, sized to the canvas, and scaled with `transform: translate(var(--deck-x), var(--deck-y)) scale(var(--deck-scale))`. A transform makes the root the containing block for fixed descendants, so put fixed elements (progress bar, help bar, notes panel) outside the root.
- All slides sit in one grid cell, so entering and leaving slides overlap.
- Inactive slides, `[data-notes]`, and a hidden notes panel are hidden with `display: none !important`. Your rules such as `[data-slide] { display: flex }` cannot show inactive slides by accident. Use `data-layout="col"` or set `display` on the slide freely; only the hiding rules are important.
- The root has `touch-action: pan-y`, so horizontal swipes reach the library.
- The root never shows a focus outline (`outline: none !important` on `[data-deck]:focus`). The library moves focus to the root only as a fallback, for example after you leave overview, and a ring around the whole stage would look like a rendering bug. Focus rings on links and buttons inside slides are not affected.
- Overview mode turns the root into a scrollable grid of thumbnails scaled with CSS `zoom`. Let the page scroll in overview, for example `body:has([data-mode-overview]) { overflow: auto; }`.
- Print shows one slide per page at the canvas size. The `print` plugin adds `@page { size: <width>px <height>px; margin: 0 }`.

Every selector is wrapped in `:where()`, so it has zero specificity and your rules win. To ship the CSS yourself, use `PlainSlides.start({ injectStyles: false })` and copy `dist/structure.css` into your stylesheet. `destroy()` removes the injected elements.

## 19. Checklist before you hand the deck to a person

1. `plainslides.iife.js` is next to `index.html`, loaded with a plain `<script src>`, and `PlainSlides.start()` runs after the deck markup.
2. The page loads from `file://` with the network turned off. No font CDN, no remote images, no remote scripts.
3. The browser console shows no `[plainslides]` warnings and no errors.
4. Every slide has a title, a `data-section`, and a `data-duration`. The durations add up to the talk length.
5. Hidden steps are invisible: `[data-step-state='hidden'] { visibility: hidden; }`.
6. Every transition name used in `data-transition` has keyframes, and every animation sits inside `@media (prefers-reduced-motion: no-preference)`.
7. Every slide has a background color, so slides do not show through each other during transitions.
8. Text fits on every slide at 1600 by 900. Nothing overflows the slide edges.
9. Text contrast is at least 4.5:1 in every theme, including accent text.
10. Images have `alt`; figures and charts have an accessible name with the full data.
11. Press through the whole deck with the arrow keys, then back. Check `O` (overview), `N` (notes), `S` (presenter), `T` (theme), and `?` (help).
12. Speaker notes are in `<aside data-notes>` on the slides that need them.
13. Print preview shows one slide per page with all steps visible.
