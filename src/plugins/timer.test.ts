import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildSlides } from '../core/registry'
import { makeDeck, mountDeck } from '../test-utils'
import type { TimerState } from '../types'
import { formatClock, paceText } from './fill'
import { timer, timerState } from './timer'

const specs = [
  { title: 'One', attrs: { 'data-duration': '60' } },
  { title: 'Two', attrs: { 'data-duration': '120' } },
  { title: 'Three' },
]

const html = `<span data-deck-clock></span><span data-deck-pace></span>`

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('timerState', () => {
  const slides = buildSlides(mountDeck(specs))

  it('compares elapsed time with the plan at the middle of the slide', () => {
    expect(timerState(slides, 1, 0, 120_000)).toMatchObject({
      running: true,
      elapsed: 120,
      plannedTotal: 180,
      plannedUntilNow: 120,
      pace: 'on',
      delta: 0,
    })
    expect(timerState(slides, 0, 0, 60_000).pace).toBe('behind')
    expect(timerState(slides, 1, 0, 60_000).pace).toBe('ahead')
    expect(timerState(slides, 1, 0, 130_000, 15).pace).toBe('on')
  })

  it('counts the plan from the slide where the clock started', () => {
    expect(timerState(slides, 1, 0, 60_000, 15, 1)).toMatchObject({
      plannedUntilNow: 60,
      pace: 'on',
    })
    expect(timerState(slides, 0, 0, 0, 15, 2).plannedUntilNow).toBe(30)
  })

  it('has no pace without durations and no time before the start', () => {
    const plain = buildSlides(mountDeck([{ title: 'A' }]))
    expect(timerState(plain, 0, 0, 5000).pace).toBeUndefined()
    expect(timerState(slides, 0, undefined, 5000)).toMatchObject({
      running: false,
      elapsed: 0,
    })
  })
})

describe('formatting', () => {
  it('formats the clock and the pace', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(75.6)).toBe('01:15')
    expect(formatClock(3723)).toBe('1:02:03')
    expect(paceText('on', 3)).toBe('On pace')
    expect(paceText('behind', 80)).toBe('1:20 behind')
    expect(paceText('ahead', -40)).toBe('0:40 ahead')
    expect(paceText(undefined, 0)).toBe('')
  })
})

describe('timer plugin', () => {
  const setup = (options = {}) => {
    const deck = makeDeck(specs, { plugins: [timer(options)] })
    document.body.insertAdjacentHTML('beforeend', html)
    const ticks: TimerState[] = []
    deck.on('tick', (state) => ticks.push(state))
    return { deck, ticks }
  }
  const clock = () => document.querySelector('[data-deck-clock]')?.textContent
  const pace = () => document.querySelector<HTMLElement>('[data-deck-pace]')

  it('starts on the first navigation and ticks every second', () => {
    const { deck, ticks } = setup()
    vi.advanceTimersByTime(5000)
    expect(ticks).toHaveLength(0)
    deck.next()
    expect(ticks.at(-1)?.running).toBe(true)
    vi.advanceTimersByTime(3000)
    expect(clock()).toBe('00:03')
    expect(pace()?.dataset.pace).toBe('ahead')
    expect(pace()?.textContent).toBe('0:57 ahead')
    deck.next()
    expect(ticks.at(-1)?.elapsed).toBe(3)
  })

  it('starts at load', () => {
    const { ticks } = setup({ start: 'load' })
    vi.advanceTimersByTime(2000)
    expect(ticks.at(-1)?.elapsed).toBe(2)
  })

  it('starts only with the reset command in manual mode', () => {
    const { deck, ticks } = setup({ start: 'manual' })
    deck.next()
    expect(ticks.at(-1)?.running).toBe(false)
    vi.advanceTimersByTime(4000)
    deck.run('timer-reset')
    expect(ticks.at(-1)).toMatchObject({ running: true, elapsed: 0 })
    expect(deck.keymap.lookup('r')).toBe('timer-reset')
  })

  it('updates when the tab becomes visible and stops on destroy', () => {
    const { deck, ticks } = setup({ start: 'load', key: false })
    document.dispatchEvent(new Event('visibilitychange'))
    const count = ticks.length
    expect(count).toBeGreaterThan(0)
    deck.destroy()
    vi.advanceTimersByTime(5000)
    expect(ticks).toHaveLength(count)
  })
})
