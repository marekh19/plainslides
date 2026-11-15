import { listen } from '../core/dom'
import type { Plugin, SlideInfo } from '../types'

export interface HashOptions {
  /** `'replace'` (default) keeps one history entry; `'push'` adds one per change. */
  history?: 'replace' | 'push'
}

const STEP_SUFFIX = /^(.+)\.(\d+)$/
const NUMBER = /^\d+$/

const findSlide = (slides: readonly SlideInfo[], ref: string) =>
  slides.find((slide) => slide.id === ref)?.index ??
  (NUMBER.test(ref) ? Number(ref) - 1 : undefined)

/**
 * Parses `#3`, `#slide-id`, `#3.2`, or `#slide-id.2` into a 0-based index and
 * a step. A slide `id` wins over the step suffix, so `id="v1.2"` works.
 */
export const parseHash = (
  hash: string,
  slides: readonly SlideInfo[],
): { index: number; step: number } | undefined => {
  const raw = hash.replace(/^#/, '')
  if (raw === '') return
  let ref = raw
  try {
    ref = decodeURIComponent(raw)
  } catch {
    // Keep the raw value when the hash is not valid percent-encoding.
  }
  const whole = slides.find((slide) => slide.id === ref)
  if (whole) return { index: whole.index, step: 0 }
  const match = STEP_SUFFIX.exec(ref)
  const index = findSlide(slides, match?.[1] ?? ref)
  if (index === undefined || index < 0) return
  return { index, step: match ? Number(match[2]) : 0 }
}

/** `#slide-id` or the 1-based number, with `.step` when the step is not 0. */
export const formatHash = (slide: SlideInfo, step: number) =>
  `#${slide.id === undefined ? slide.index + 1 : encodeURIComponent(slide.id)}${step > 0 ? `.${step}` : ''}`

/** Syncs the URL hash with the current slide and step. */
export const hash =
  (options: HashOptions = {}): Plugin =>
  (deck) => {
    const win = deck.root.ownerDocument.defaultView
    if (!win) return
    const mode = options.history ?? 'replace'

    const write = (historyMode: 'replace' | 'push') => {
      const slide = deck.slides[deck.index]
      if (!slide) return
      const target = formatHash(slide, deck.step)
      if (win.location.hash === target) return
      try {
        if (historyMode === 'push') win.history.pushState(null, '', target)
        else win.history.replaceState(win.history.state, '', target)
      } catch {
        // Some browsers block history changes on file:// URLs.
        win.location.replace(target)
      }
    }

    const read = (transition: boolean) => {
      const target = parseHash(win.location.hash, deck.slides)
      if (target) deck.go(target.index, { step: target.step, transition })
    }

    read(false)
    write('replace')
    const cleanups = [
      deck.on('change', () => write(mode)),
      listen(win, 'hashchange', () => read(true)),
      listen(win, 'popstate', () => read(true)),
    ]
    return () => cleanups.forEach((cleanup) => cleanup())
  }
