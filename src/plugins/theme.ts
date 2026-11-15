import { createWriter } from '../core/writer'
import type { Plugin } from '../types'

export interface ThemeOptions {
  /** Themes in toggle order. Default `['dark', 'light']`. */
  themes?: readonly string[]
  /** `localStorage` key. Default `plainslides-theme`. */
  storageKey?: string
  /** Key for the `theme` command. Default `t`. */
  key?: string | false
}

const read = (storage: Storage | undefined, key: string) => {
  try {
    return storage?.getItem(key) ?? undefined
  } catch {
    return undefined
  }
}

const save = (storage: Storage | undefined, key: string, value: string) => {
  try {
    storage?.setItem(key, value)
  } catch {
    // Storage can be blocked, for example in private windows.
  }
}

/** The theme to start with: `data-theme` in the HTML, the stored choice, then the system setting. */
export const initialTheme = (
  themes: readonly string[],
  fromHtml: string | undefined,
  stored: string | undefined,
  prefersDark: boolean,
) => {
  if (fromHtml) return fromHtml
  if (stored !== undefined && themes.includes(stored)) return stored
  const system = prefersDark ? 'dark' : 'light'
  return themes.includes(system) ? system : (themes[0] ?? system)
}

/** Toggles `data-theme` on `<html>` and stores the choice. */
export const theme =
  (options: ThemeOptions = {}): Plugin =>
  (deck) => {
    const {
      themes = ['dark', 'light'],
      storageKey = 'plainslides-theme',
      key = 't',
    } = options
    const doc = deck.root.ownerDocument
    const win = doc.defaultView ?? undefined
    const html = doc.documentElement
    const writer = createWriter()
    let storage: Storage | undefined
    try {
      storage = win?.localStorage
    } catch {
      storage = undefined
    }

    const apply = (value: string) => {
      writer.attr(html, 'data-theme', value)
      deck.emit('theme', { theme: value })
    }

    apply(
      initialTheme(
        themes,
        html.getAttribute('data-theme') ?? undefined,
        read(storage, storageKey),
        win?.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
      ),
    )

    const cleanups = [
      deck.commands.register('theme', {
        label: 'Theme',
        run: () => {
          const current = themes.indexOf(html.getAttribute('data-theme') ?? '')
          const next = themes[(current + 1) % themes.length]
          if (next === undefined) return
          save(storage, storageKey, next)
          apply(next)
        },
      }),
      key === false ? undefined : deck.keymap.bind(key, 'theme'),
    ]
    return () => {
      cleanups.forEach((cleanup) => cleanup?.())
      writer.restore()
    }
  }
