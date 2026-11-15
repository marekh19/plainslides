import type { Command, CommandRegistry, Keymap, KeymapEntry } from '../types'

export const createCommands = (): CommandRegistry => {
  const commands = new Map<string, Command>()
  return {
    register(name, command) {
      commands.set(name, command)
      return () => {
        if (commands.get(name) === command) commands.delete(name)
      }
    },
    get: (name) => commands.get(name),
    list: () =>
      [...commands.entries()].map(([name, { label }]) => ({ name, label })),
  }
}

type Binding = { readonly key: string; readonly command: string }

const normalizeKey = (key: string) =>
  key === ' ' ? 'Space' : key.length === 1 ? key.toLowerCase() : key

export const createKeymap = (commands: CommandRegistry): Keymap => {
  let bindings: readonly Binding[] = []

  const commandsFor = (key: string) => [
    ...new Set(
      bindings.filter((binding) => binding.key === key).map((b) => b.command),
    ),
  ]

  return {
    bind(key, command) {
      const binding = { key: normalizeKey(key), command }
      bindings = [...bindings, binding]
      return () => {
        bindings = bindings.filter((existing) => existing !== binding)
      }
    },
    lookup(key) {
      const normalized = normalizeKey(key)
      return bindings.findLast((binding) => binding.key === normalized)?.command
    },
    list() {
      return commands.list().flatMap(({ name, label }): KeymapEntry[] => {
        const keys = bindings
          .filter((binding) => binding.command === name)
          .map((binding) => binding.key)
        return keys.length > 0 ? [{ command: name, label, keys }] : []
      })
    },
    conflicts() {
      const keys = [...new Set(bindings.map((binding) => binding.key))]
      return keys
        .map((key) => ({ key, commands: commandsFor(key) }))
        .filter((entry) => entry.commands.length > 1)
    },
  }
}

/**
 * The keymap name for a keyboard event: `Space` for the space bar, lower-case
 * printable characters, and a `Shift+` prefix for named keys.
 */
export const keyName = (event: Pick<KeyboardEvent, 'key' | 'shiftKey'>) => {
  const key = normalizeKey(event.key)
  return key.length > 1 && event.shiftKey && key !== 'Shift'
    ? `Shift+${key}`
    : key
}

const KEY_LABELS: Readonly<Record<string, string>> = {
  ArrowRight: '→',
  ArrowLeft: '←',
  ArrowUp: '↑',
  ArrowDown: '↓',
  PageDown: 'PgDn',
  PageUp: 'PgUp',
  Escape: 'Esc',
}

/** Short display text for a key name. */
export const keyLabel = (key: string): string => {
  if (key.startsWith('Shift+')) return `Shift+${keyLabel(key.slice(6))}`
  return KEY_LABELS[key] ?? (key.length === 1 ? key.toUpperCase() : key)
}
