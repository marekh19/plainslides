import { keyLabel } from '../core/commands'
import { queryAll, type Scope } from '../core/dom'
import { progressOf } from '../core/navigation'
import type { Writer } from '../core/writer'
import type { Deck, Pace, SlideInfo, TimerState } from '../types'

/** Formats the page number. `number` is 1-based. */
export type PageFormat = (number: number, count: number) => string

const defaultPageFormat: PageFormat = (number, count) => `${number} / ${count}`

/** Binding elements, excluding copies inside presenter previews. */
const targets = (scope: Scope, selector: string) =>
  queryAll(scope, selector).filter(
    (element) => !element.closest('[data-deck-preview]'),
  )

/** The slide that contains the element, or the current slide. */
const contextSlide = (deck: Deck, element: Element): SlideInfo | undefined => {
  const owner = element.closest('[data-slide]')
  return (
    deck.slides.find((slide) => slide.element === owner) ??
    deck.slides[deck.index]
  )
}

const setText = (writer: Writer, element: Element, text: string) => {
  if (element.textContent !== text) writer.content(element, [text])
}

export const fillPage = (
  scope: Scope,
  deck: Deck,
  writer: Writer,
  format: PageFormat = defaultPageFormat,
) =>
  targets(scope, '[data-deck-page]').forEach((element) => {
    const slide = contextSlide(deck, element)
    setText(
      writer,
      element,
      slide ? format(slide.index + 1, deck.slides.length) : '',
    )
  })

export const fillProgress = (scope: Scope, deck: Deck, writer: Writer) =>
  targets(scope, '[data-deck-progress]').forEach((element) => {
    const count = deck.slides.length
    writer.prop(
      element,
      '--deck-progress',
      String(progressOf(deck.index, count)),
    )
    writer.attr(element, 'role', 'progressbar')
    writer.attr(element, 'aria-valuemin', '1')
    writer.attr(element, 'aria-valuemax', String(Math.max(count, 1)))
    writer.attr(element, 'aria-valuenow', String(deck.index + 1))
    writer.attr(
      element,
      'aria-valuetext',
      `Slide ${deck.index + 1} of ${count}`,
    )
  })

export const fillSection = (scope: Scope, deck: Deck, writer: Writer) =>
  targets(scope, '[data-deck-section]').forEach((element) =>
    setText(writer, element, contextSlide(deck, element)?.section ?? ''),
  )

const rangeOf = (deck: Deck, name: string) =>
  deck.sections.find((section) => section.name === name) ??
  deck.sections
    .flatMap((section) => section.subsections)
    .find((subsection) => subsection.name === name)

export const fillTrackers = (scope: Scope, deck: Deck, writer: Writer) =>
  targets(scope, '[data-deck-tracker], [data-deck-agenda]').forEach(
    (tracker) => {
      const slide = contextSlide(deck, tracker)
      queryAll(tracker, '[data-deck-tracker-item]').forEach((item) => {
        const name = item.dataset.deckTrackerItem?.trim() ?? ''
        const current =
          slide !== undefined &&
          (name === slide.section || name === slide.subsection)
        const range = rangeOf(deck, name)
        const past =
          !current &&
          slide !== undefined &&
          range !== undefined &&
          range.start < slide.index
        writer.attr(item, 'aria-current', current ? 'step' : null)
        writer.attr(
          item,
          'data-state',
          current ? 'current' : past ? 'past' : 'future',
        )
      })
    },
  )

/** Notes HTML of the slide and the next slide's title. */
export const fillNotes = (
  scope: Scope,
  deck: Deck,
  writer: Writer,
  index = deck.index,
) => {
  const doc = 'body' in scope ? scope : scope.ownerDocument
  const notes = deck.slides[index]?.notes
  targets(scope, '[data-deck-notes-text]').forEach((element) =>
    writer.content(
      element,
      notes
        ? [...notes.childNodes].map((node) => doc.importNode(node, true))
        : [],
    ),
  )
  targets(scope, '[data-deck-next-title]').forEach((element) =>
    setText(writer, element, deck.slides[index + 1]?.title ?? ''),
  )
}

const pad = (value: number) => String(value).padStart(2, '0')

/** `mm:ss`, or `h:mm:ss` from one hour. */
export const formatClock = (seconds: number) => {
  const total = Math.max(Math.floor(seconds), 0)
  const hours = Math.floor(total / 3600)
  const rest = `${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`
  return hours > 0 ? `${hours}:${rest}` : rest
}

const formatDelta = (seconds: number) => {
  const total = Math.round(Math.abs(seconds))
  return `${Math.floor(total / 60)}:${pad(total % 60)}`
}

export const paceText = (pace: Pace | undefined, delta: number) => {
  if (pace === undefined) return ''
  if (pace === 'on') return 'On pace'
  return `${formatDelta(delta)} ${pace}`
}

export const fillTimer = (scope: Scope, state: TimerState, writer: Writer) => {
  targets(scope, '[data-deck-clock]').forEach((element) =>
    setText(writer, element, formatClock(state.elapsed)),
  )
  targets(scope, '[data-deck-pace]').forEach((element) => {
    setText(writer, element, paceText(state.pace, state.delta))
    writer.attr(element, 'data-pace', state.pace ?? null)
  })
}

/** Renders the key list from the keymap into `[data-deck-keys]` elements. */
export const renderKeys = (scope: Scope, deck: Deck, writer: Writer) =>
  targets(scope, '[data-deck-keys]').forEach((container) => {
    const doc = container.ownerDocument
    const itemTag = ['UL', 'OL'].includes(container.tagName) ? 'li' : 'span'
    const items = deck.keymap.list().map(({ command, label, keys }) => {
      const item = doc.createElement(itemTag)
      item.setAttribute('data-deck-key', command)
      keys.forEach((key) => {
        const kbd = doc.createElement('kbd')
        kbd.textContent = keyLabel(key)
        item.append(kbd, ' ')
      })
      const text = doc.createElement('span')
      text.textContent = label
      item.append(text)
      return item
    })
    writer.content(container, items)
  })
