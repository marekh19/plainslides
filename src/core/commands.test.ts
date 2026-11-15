import { describe, expect, it, vi } from 'vitest'
import { createCommands, createKeymap, keyLabel, keyName } from './commands'

const setup = () => {
  const commands = createCommands()
  commands.register('next', { label: 'Next', run: vi.fn() })
  commands.register('theme', { label: 'Theme', run: vi.fn() })
  return { commands, keymap: createKeymap(commands) }
}

describe('commands', () => {
  it('registers, lists, and removes commands', () => {
    const { commands } = setup()
    const remove = commands.register('extra', { label: 'Extra', run: vi.fn() })
    expect(commands.list().map((command) => command.name)).toEqual([
      'next',
      'theme',
      'extra',
    ])
    remove()
    expect(commands.get('extra')).toBeUndefined()
  })

  it('keeps a replacement when the old registration is removed', () => {
    const { commands } = setup()
    const remove = commands.register('x', { label: 'Old', run: vi.fn() })
    commands.register('x', { label: 'New', run: vi.fn() })
    remove()
    expect(commands.get('x')?.label).toBe('New')
  })
})

describe('keymap', () => {
  it('normalizes keys and lists bindings by command order', () => {
    const { keymap } = setup()
    keymap.bind('T', 'theme')
    keymap.bind(' ', 'next')
    keymap.bind('ArrowRight', 'next')
    keymap.bind('x', 'missing')
    expect(keymap.lookup('t')).toBe('theme')
    expect(keymap.lookup('Space')).toBe('next')
    expect(keymap.list()).toEqual([
      { command: 'next', label: 'Next', keys: ['Space', 'ArrowRight'] },
      { command: 'theme', label: 'Theme', keys: ['t'] },
    ])
  })

  it('reports conflicts and lets the latest binding win', () => {
    const { keymap } = setup()
    keymap.bind('n', 'next')
    const unbind = keymap.bind('n', 'theme')
    keymap.bind('n', 'theme')
    expect(keymap.lookup('n')).toBe('theme')
    expect(keymap.conflicts()).toEqual([
      { key: 'n', commands: ['next', 'theme'] },
    ])
    unbind()
    expect(keymap.conflicts()).toHaveLength(1)
  })
})

describe('keyName', () => {
  it('maps events to keymap names', () => {
    expect(keyName({ key: ' ', shiftKey: false })).toBe('Space')
    expect(keyName({ key: ' ', shiftKey: true })).toBe('Shift+Space')
    expect(keyName({ key: 'O', shiftKey: true })).toBe('o')
    expect(keyName({ key: '?', shiftKey: true })).toBe('?')
    expect(keyName({ key: 'Shift', shiftKey: true })).toBe('Shift')
  })
})

describe('keyLabel', () => {
  it('returns short display text', () => {
    expect(keyLabel('ArrowRight')).toBe('→')
    expect(keyLabel('Shift+Space')).toBe('Shift+Space')
    expect(keyLabel('o')).toBe('O')
    expect(keyLabel('Home')).toBe('Home')
  })
})
