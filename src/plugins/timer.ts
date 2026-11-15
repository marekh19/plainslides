import { listen } from '../core/dom'
import { createWriter } from '../core/writer'
import type { Plugin, SlideInfo, TimerState } from '../types'
import { fillTimer } from './fill'

export interface TimerOptions {
  /** Seconds of difference that still count as on pace. Default 15. */
  tolerance?: number
  /**
   * When the clock starts. `'first-navigation'` (default) starts on the first
   * slide or step change, `'load'` at once, `'manual'` only with the
   * `timer-reset` command.
   */
  start?: 'first-navigation' | 'load' | 'manual'
  /** Key for the `timer-reset` command, which starts or restarts the clock. Default `r`. */
  key?: string | false
}

const sum = (values: readonly number[]) =>
  values.reduce((total, value) => total + value, 0)

/**
 * Pure timer calculation. Pace compares elapsed time with the plan at the
 * middle of the current slide. The plan starts at `startIndex`, the slide
 * where the clock started, so slides before it do not count.
 */
export const timerState = (
  slides: readonly SlideInfo[],
  index: number,
  startedAt: number | undefined,
  now: number,
  tolerance = 15,
  startIndex = 0,
): TimerState => {
  const durations = slides.map((slide) => slide.duration ?? 0)
  const plannedTotal = sum(durations)
  const plannedUntilNow =
    sum(durations.slice(0, index)) -
    sum(durations.slice(0, Math.min(startIndex, index))) +
    (durations[index] ?? 0) / 2
  const elapsed =
    startedAt === undefined ? 0 : Math.max((now - startedAt) / 1000, 0)
  const delta = elapsed - plannedUntilNow
  const pace =
    plannedTotal === 0
      ? undefined
      : Math.abs(delta) <= tolerance
        ? 'on'
        : delta > 0
          ? 'behind'
          : 'ahead'
  return {
    running: startedAt !== undefined,
    startedAt,
    elapsed,
    plannedTotal,
    plannedUntilNow,
    pace,
    delta,
  }
}

/**
 * Clock and pace from `data-duration`. Fills `[data-deck-clock]` and
 * `[data-deck-pace]` and emits `tick` every second while the clock runs.
 */
export const timer =
  (options: TimerOptions = {}): Plugin =>
  (deck) => {
    const { tolerance = 15, start = 'first-navigation', key = 'r' } = options
    const doc = deck.root.ownerDocument
    const writer = createWriter()
    let startedAt = start === 'load' ? Date.now() : undefined
    let startIndex = deck.index
    let interval: ReturnType<typeof setInterval> | undefined

    const tick = () => {
      const state = timerState(
        deck.slides,
        deck.index,
        startedAt,
        Date.now(),
        tolerance,
        startIndex,
      )
      fillTimer(doc, state, writer)
      deck.emit('tick', state)
    }
    const run = () => {
      if (interval === undefined && startedAt !== undefined) {
        interval = setInterval(tick, 1000)
      }
    }
    const restart = () => {
      startedAt = Date.now()
      startIndex = deck.index
      run()
      tick()
    }

    const cleanups = [
      deck.on('change', () => {
        if (startedAt === undefined && start === 'first-navigation') restart()
        else tick()
      }),
      deck.commands.register('timer-reset', {
        label: 'Restart timer',
        run: restart,
      }),
      key === false ? undefined : deck.keymap.bind(key, 'timer-reset'),
      // Catch up after the tab was in the background.
      listen(doc, 'visibilitychange', tick),
    ]
    run()
    tick()

    return () => {
      clearInterval(interval)
      cleanups.forEach((cleanup) => cleanup?.())
      writer.restore()
    }
  }
