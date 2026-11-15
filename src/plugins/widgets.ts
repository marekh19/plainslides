import { queryAll } from '../core/dom'
import type { Deck, DeckEventName, DeckEvents, Plugin } from '../types'

export interface WidgetContext {
  readonly deck: Deck
  /** The current `data-theme` on `<html>`. */
  readonly theme: string | undefined
  /** True inside a presenter preview. */
  readonly preview: boolean
  /** Like `deck.on`, but unsubscribes when the widget unmounts. */
  on<E extends DeckEventName>(
    event: E,
    handler: (payload: DeckEvents[E]) => void,
  ): () => void
}

export interface Widget {
  /** Renders into the element. Returns an optional cleanup function. */
  mount(element: HTMLElement, context: WidgetContext): (() => void) | void
}

export type WidgetRegistry = Readonly<Record<string, Widget>>

/** Mounts registered widgets into `[data-widget="name"]` elements. */
export const widgets =
  (registry: WidgetRegistry = {}): Plugin =>
  (deck) => {
    const html = deck.root.ownerDocument.documentElement
    const mounted = new Map<HTMLElement, () => void>()

    const mount = (element: HTMLElement, preview: boolean) => {
      const widget = registry[element.dataset.widget ?? '']
      if (!widget || mounted.has(element)) return
      const subscriptions: (() => void)[] = []
      const context: WidgetContext = {
        deck,
        preview,
        get theme() {
          return html.getAttribute('data-theme') ?? undefined
        },
        on(event, handler) {
          const off = deck.on(event, handler)
          subscriptions.push(off)
          return off
        },
      }
      const cleanup = widget.mount(element, context)
      mounted.set(element, () => {
        subscriptions.forEach((off) => off())
        cleanup?.()
      })
    }

    const unmount = (element: HTMLElement) => {
      mounted.get(element)?.()
      mounted.delete(element)
    }

    queryAll(deck.root, '[data-widget]').forEach((element) =>
      mount(element, false),
    )

    const cleanups = [
      deck.on('preview', ({ element }) => {
        // Previews are replaced on every render; drop widgets in old ones.
        ;[...mounted.keys()]
          .filter((existing) => !existing.isConnected)
          .forEach(unmount)
        queryAll(element, '[data-widget]').forEach((target) => {
          // A clone carries the rendered output of the original widget.
          target.replaceChildren()
          mount(target, true)
        })
      }),
      deck.addCheck(() =>
        queryAll(deck.root, '[data-widget]')
          .filter((element) => !registry[element.dataset.widget ?? ''])
          .map((element) => ({
            code: 'widget',
            message: `No widget is registered for data-widget="${element.dataset.widget}".`,
            element,
          })),
      ),
    ]

    return () => {
      cleanups.forEach((cleanup) => cleanup())
      ;[...mounted.keys()].forEach(unmount)
    }
  }
