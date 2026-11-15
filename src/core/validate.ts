import { LAYOUTS } from '../styles/layout'
import type { DeckIssue, Keymap, SlideInfo } from '../types'
import { queryAll } from './dom'
import { ownTitle, positive } from './registry'
import { isIntegerStep } from './steps'

const issue = (code: string, message: string, element?: Element): DeckIssue =>
  element ? { code, message, element } : { code, message }

const label = (slide: SlideInfo) => `Slide ${slide.index + 1}`

const slideIssues = (slide: SlideInfo): DeckIssue[] => {
  const { element } = slide
  const raw = element.dataset.duration
  const h1s = queryAll(element, 'h1').filter((h) => !h.closest('[data-notes]'))
  return [
    ...(ownTitle(element) === undefined
      ? [
          issue(
            'slide-title',
            `${label(slide)} has no title. Add data-title, an h1 or h2, or [data-role="eyebrow"].`,
            element,
          ),
        ]
      : []),
    ...(raw !== undefined && positive(raw) === undefined
      ? [
          issue(
            'duration',
            `${label(slide)}: data-duration="${raw}" is not a positive number of seconds.`,
            element,
          ),
        ]
      : []),
    ...queryAll(element, '[data-step]')
      .filter((step) => !isIntegerStep(step.dataset.step ?? ''))
      .map((step) =>
        issue(
          'step-value',
          `${label(slide)}: data-step="${step.dataset.step}" is not an integer.`,
          step,
        ),
      ),
    ...(h1s.length > 1
      ? [
          issue(
            'h1-count',
            `${label(slide)} has ${h1s.length} h1 elements.`,
            element,
          ),
        ]
      : []),
  ]
}

const hasName = (figure: Element) =>
  figure.hasAttribute('aria-label') ||
  figure.hasAttribute('aria-labelledby') ||
  figure.querySelector('figcaption') !== null

export const coreIssues = (
  root: HTMLElement,
  slides: readonly SlideInfo[],
  keymap: Keymap,
): DeckIssue[] => {
  const names = new Set(
    slides.flatMap((slide) => [slide.section, slide.subsection]),
  )
  const sizeIssues = (['width', 'height'] as const).flatMap((name) => {
    const raw = root.dataset[name]
    return raw !== undefined && positive(raw) === undefined
      ? [
          issue(
            'size',
            `data-${name}="${raw}" is not a positive number of pixels.`,
            root,
          ),
        ]
      : []
  })
  return [
    ...(slides.length === 0
      ? [issue('no-slides', 'The deck has no [data-slide] children.', root)]
      : []),
    ...sizeIssues,
    ...slides.flatMap(slideIssues),
    ...queryAll(root.ownerDocument, '[data-layout]')
      .filter((element) => !LAYOUTS.includes(element.dataset.layout ?? ''))
      .map((element) =>
        issue(
          'layout',
          `Unknown data-layout="${element.dataset.layout}". Use one of: ${LAYOUTS.join(', ')}.`,
          element,
        ),
      ),
    ...queryAll(root.ownerDocument, '[data-deck-tracker-item]')
      .filter((item) => !names.has(item.dataset.deckTrackerItem?.trim()))
      .map((item) =>
        issue(
          'tracker-item',
          `Tracker item "${item.dataset.deckTrackerItem}" matches no data-section or data-subsection.`,
          item,
        ),
      ),
    ...queryAll(root, 'figure')
      .filter((figure) => !hasName(figure))
      .map((figure) =>
        issue(
          'figure-name',
          'A figure has no accessible name. Add a figcaption or aria-label.',
          figure,
        ),
      ),
    ...queryAll(root, 'img:not([alt])').map((img) =>
      issue('img-alt', 'An image has no alt attribute.', img),
    ),
    ...keymap
      .conflicts()
      .map(({ key, commands }) =>
        issue(
          'key-conflict',
          `Key "${key}" is bound to more than one command: ${commands.join(', ')}.`,
        ),
      ),
  ]
}
