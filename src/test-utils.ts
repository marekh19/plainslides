import { createDeck } from './core/deck'
import type { Deck, DeckOptions } from './types'

export interface SlideSpec {
  id?: string
  title?: string
  html?: string
  attrs?: Readonly<Record<string, string | undefined>>
}

/** Builds a deck root in the document body. */
export const mountDeck = (
  slides: readonly SlideSpec[],
  rootAttrs: Record<string, string> = {},
) => {
  document.body.innerHTML = ''
  const root = document.createElement('main')
  root.setAttribute('data-deck', '')
  Object.entries(rootAttrs).forEach(([name, value]) =>
    root.setAttribute(name, value),
  )
  slides.forEach((spec) => {
    const slide = document.createElement('section')
    slide.setAttribute('data-slide', '')
    if (spec.id) slide.id = spec.id
    Object.entries(spec.attrs ?? {}).forEach(([name, value]) => {
      if (value !== undefined) slide.setAttribute(name, value)
    })
    slide.innerHTML = `${spec.title === undefined ? '' : `<h2>${spec.title}</h2>`}${spec.html ?? ''}`
    root.append(slide)
  })
  document.body.append(root)
  return root
}

const decks = new Set<Deck>()

export const makeDeck = (
  slides: readonly SlideSpec[],
  options: DeckOptions = {},
  rootAttrs: Record<string, string> = {},
) => {
  const deck = createDeck(mountDeck(slides, rootAttrs), {
    warnings: false,
    ...options,
  })
  decks.add(deck)
  return deck
}

/** Destroys every deck from `makeDeck`, so no listener leaks into the next test. */
export const destroyDecks = () => {
  decks.forEach((deck) => deck.destroy())
  decks.clear()
  document.body.innerHTML = ''
}

export const slideElements = (root: HTMLElement) => [
  ...root.querySelectorAll<HTMLElement>(':scope > [data-slide]'),
]
