import { listen, queryAll } from '../core/dom'
import { nextPosition, type Position } from '../core/navigation'
import { collectStepGroups, stepState } from '../core/steps'
import { createWriter } from '../core/writer'
import type { Deck, Plugin, TimerState } from '../types'
import { fillNotes, fillPage, fillSection, fillTimer } from './fill'
import { handleKey } from './keyboard'
import { timerState } from './timer'

export interface PresenterOptions {
  /** Key for the `presenter` command. Default `s`. */
  key?: string | false
  /** Window name, so the same popup is reused. Default `plainslides-presenter`. */
  name?: string
  /** `window.open` features. Default `popup,width=1280,height=800`. */
  features?: string
}

const LAYOUT_CSS = `:where(body){margin:0}
:where([data-deck-presenter-layout]){display:grid;grid-template:"current next" minmax(0,3fr) "current info" auto "notes notes" minmax(0,2fr)/minmax(0,3fr) minmax(0,2fr);gap:16px;box-sizing:border-box;height:100vh;padding:16px}
:where([data-deck-presenter-current]){grid-area:current}
:where([data-deck-presenter-next]){grid-area:next}
:where([data-deck-presenter-info]){grid-area:info;display:flex;flex-wrap:wrap;gap:8px 16px}
:where([data-deck-presenter-layout]>[data-deck-notes-text]){grid-area:notes;overflow:auto}
:where([data-deck-presenter-current],[data-deck-presenter-next]){position:relative;min-width:0;min-height:0;overflow:hidden}`

const DEFAULT_TEMPLATE = `<div data-deck-presenter-layout>
<div data-deck-presenter-current aria-label="Current slide"></div>
<div data-deck-presenter-next aria-label="Next"></div>
<div data-deck-presenter-info><span data-deck-page></span> <span data-deck-clock></span> <span data-deck-pace></span> <span>Next: <span data-deck-next-title></span></span></div>
<div data-deck-notes-text></div>
</div>`

const TRANSIENT = [
  'data-leaving',
  'data-entering',
  'data-transitioning',
  'inert',
  'aria-current',
  'tabindex',
  'id',
]

/** Copies the root without children, so author selectors on the root still match. */
const previewRoot = (deck: Deck, doc: Document) => {
  const frame = doc.importNode(deck.root, false)
  TRANSIENT.forEach((name) => frame.removeAttribute(name))
  ;[...frame.attributes]
    .filter((attr) => attr.name.startsWith('data-mode-'))
    .forEach((attr) => frame.removeAttribute(attr.name))
  frame.setAttribute('data-deck-preview', '')
  frame.setAttribute('aria-hidden', 'true')
  frame.setAttribute('inert', '')
  return frame
}

const previewSlide = (
  deck: Deck,
  doc: Document,
  { index, step }: Position,
  showAll: boolean,
) => {
  const source = deck.slides[index]
  if (!source) return
  const slide = doc.importNode(source.element, true)
  TRANSIENT.forEach((name) => slide.removeAttribute(name))
  slide.setAttribute('data-state', 'active')
  const groups = collectStepGroups(slide)
  const revealed = showAll ? groups.length : step
  groups.forEach((group, groupIndex) =>
    group.forEach((element) => {
      element.setAttribute('data-step-state', stepState(groupIndex, revealed))
      element.removeAttribute('inert')
      element.removeAttribute('aria-hidden')
    }),
  )
  const frame = previewRoot(deck, doc)
  frame.append(slide)
  return frame
}

const fitPreview = (deck: Deck, container: HTMLElement) => {
  const frame = container.querySelector<HTMLElement>('[data-deck-preview]')
  if (!frame) return
  const scale = Math.min(
    container.clientWidth / deck.size.width,
    container.clientHeight / deck.size.height,
  )
  frame.style.setProperty('--deck-scale', String(Math.max(scale, 0)))
}

/**
 * Presenter window. Opens a blank popup that shares the page's origin, also
 * from `file://`, and renders the current slide, the next step or slide,
 * notes, clock, and pace into it. A `<template data-deck-presenter>` replaces
 * the default layout. Reloading either window breaks the connection.
 */
export const presenter =
  (options: PresenterOptions = {}): Plugin =>
  (deck) => {
    const {
      key = 's',
      name = 'plainslides-presenter',
      features = 'popup,width=1280,height=800',
    } = options
    const doc = deck.root.ownerDocument
    const win = doc.defaultView
    if (!win) return
    const counts = deck.slides.map((slide) => slide.stepGroups.length)
    let popup: Window | undefined
    let popupCleanups: (() => void)[] = []
    let lastTick: TimerState = timerState(deck.slides, 0, undefined, 0)

    const containers = (selector: string) =>
      popup ? queryAll(popup.document, selector) : []

    const render = () => {
      if (!popup || popup.closed) return
      const pdoc = popup.document
      const writer = createWriter()
      const current = { index: deck.index, step: deck.step }
      const next = nextPosition(counts, current)
      const hasNext = next.index !== current.index || next.step !== current.step
      const previews: [string, HTMLElement | undefined][] = [
        [
          '[data-deck-presenter-current]',
          previewSlide(deck, pdoc, current, false),
        ],
        [
          '[data-deck-presenter-next]',
          hasNext
            ? previewSlide(deck, pdoc, next, next.index !== current.index)
            : undefined,
        ],
      ]
      previews.forEach(([selector, frame]) =>
        containers(selector).forEach((container) => {
          const copy = frame?.cloneNode(true)
          container.replaceChildren(...(copy ? [copy] : []))
          container.toggleAttribute('data-empty', !copy)
          fitPreview(deck, container)
          const element = container.querySelector<HTMLElement>(
            '[data-deck-preview]',
          )
          if (element) deck.emit('preview', { element })
        }),
      )
      fillPage(pdoc, deck, writer)
      fillSection(pdoc, deck, writer)
      fillNotes(pdoc, deck, writer)
      fillTimer(pdoc, lastTick, writer)
    }

    const fitAll = () =>
      ['[data-deck-presenter-current]', '[data-deck-presenter-next]'].forEach(
        (selector) =>
          containers(selector).forEach((container) =>
            fitPreview(deck, container),
          ),
      )

    const syncTheme = () => {
      const value = doc.documentElement.getAttribute('data-theme')
      const html = popup?.document.documentElement
      if (!html) return
      if (value === null) html.removeAttribute('data-theme')
      else html.setAttribute('data-theme', value)
    }

    const build = (target: Window) => {
      const pdoc = target.document
      pdoc.head.replaceChildren()
      pdoc.body.replaceChildren()
      pdoc.title = `Presenter: ${doc.title}`
      const base = pdoc.createElement('base')
      base.href = doc.baseURI
      pdoc.head.append(base)
      queryAll(doc, 'style, link[rel~="stylesheet"]').forEach((node) =>
        pdoc.head.append(pdoc.importNode(node, true)),
      )
      const template = doc.querySelector<HTMLTemplateElement>(
        'template[data-deck-presenter]',
      )
      if (template) {
        pdoc.body.append(pdoc.importNode(template.content, true))
      } else {
        const style = pdoc.createElement('style')
        style.textContent = LAYOUT_CSS
        pdoc.head.append(style)
        pdoc.body.innerHTML = DEFAULT_TEMPLATE
      }
      pdoc.body.setAttribute('data-deck-presenter-window', '')
    }

    const close = () => {
      popupCleanups.forEach((cleanup) => cleanup())
      popupCleanups = []
      const current = popup
      popup = undefined
      if (current && !current.closed) current.close()
    }

    const openWindow = () => win.open('', name, features) ?? undefined

    /** Opens and fills the popup. Undefined when blocked or not usable. */
    const tryOpen = () => {
      const target = openWindow()
      try {
        if (target) build(target)
        return target
      } catch {
        target?.close()
        return undefined
      }
    }

    const open = () => {
      // A popup left from before a reload can belong to another origin, so
      // building into it fails once; a second window is new.
      const target = tryOpen() ?? tryOpen()
      if (!target) {
        deck.warn(
          'The presenter window could not open. Showing the notes panel instead.',
        )
        deck.setMode('presenter', false)
        deck.setMode('notes', true)
        return
      }
      popup = target
      popupCleanups = [
        listen(target, 'keydown', (event) => {
          // The event comes from another window, so instanceof checks fail.
          if ('key' in event) handleKey(deck, event as KeyboardEvent)
        }),
        listen(target, 'resize', fitAll),
        listen(target, 'pagehide', () => {
          popup = undefined
          deck.setMode('presenter', false)
        }),
      ]
      syncTheme()
      render()
      target.focus()
    }

    const cleanups = [
      deck.commands.register('presenter', {
        label: 'Presenter view',
        run: () => deck.toggleMode('presenter'),
      }),
      key === false ? undefined : deck.keymap.bind(key, 'presenter'),
      deck.on('mode', ({ name: mode, on }) => {
        if (mode !== 'presenter') return
        if (on && !popup) open()
        if (!on) close()
      }),
      deck.on('change', render),
      deck.on('theme', syncTheme),
      deck.on('tick', (state) => {
        lastTick = state
        if (popup && !popup.closed) {
          fillTimer(popup.document, state, createWriter())
        }
      }),
      listen(win, 'pagehide', close),
    ]

    return () => {
      cleanups.forEach((cleanup) => cleanup?.())
      close()
      deck.setMode('presenter', false)
    }
  }
