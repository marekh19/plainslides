import type { DeckEventName, DeckEvents } from '../types'

type Handler<E extends DeckEventName> = (payload: DeckEvents[E]) => void

export const createEmitter = () => {
  const handlers = new Map<DeckEventName, Set<Handler<DeckEventName>>>()

  const on = <E extends DeckEventName>(event: E, handler: Handler<E>) => {
    const set = handlers.get(event) ?? new Set()
    // Handlers are stored by event name, so the payload type always matches.
    const stored = handler as Handler<DeckEventName>
    set.add(stored)
    handlers.set(event, set)
    return () => {
      set.delete(stored)
    }
  }

  const emit = <E extends DeckEventName>(event: E, payload: DeckEvents[E]) => {
    // Copy, so handlers that unsubscribe during the call do not skip others.
    ;[...(handlers.get(event) ?? [])].forEach((handler) => handler(payload))
  }

  return { on, emit, clear: () => handlers.clear() }
}
