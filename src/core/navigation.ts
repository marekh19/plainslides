import type { Direction } from '../types'

export interface Position {
  readonly index: number
  readonly step: number
}

/** Number of step groups on each slide. */
export type StepCounts = readonly number[]

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const resolve = (
  counts: StepCounts,
  index: number,
  step: number | 'all' = 0,
): Position => {
  const last = Math.max(counts.length - 1, 0)
  const target = clamp(Math.trunc(index), 0, last)
  const total = counts[target] ?? 0
  return {
    index: target,
    step:
      step === 'all'
        ? total
        : Number.isFinite(step)
          ? clamp(Math.trunc(step), 0, total)
          : 0,
  }
}

export const nextPosition = (
  counts: StepCounts,
  { index, step }: Position,
): Position => {
  if (step < (counts[index] ?? 0)) return { index, step: step + 1 }
  return resolve(counts, index + 1, index + 1 < counts.length ? 0 : 'all')
}

export const prevPosition = (
  counts: StepCounts,
  { index, step }: Position,
): Position => {
  if (step > 0) return { index, step: step - 1 }
  return index > 0 ? resolve(counts, index - 1, 'all') : { index, step }
}

export const directionOf = (from: Position, to: Position): Direction =>
  to.index > from.index || (to.index === from.index && to.step >= from.step)
    ? 'forward'
    : 'backward'

export const progressOf = (index: number, count: number) =>
  count <= 1 ? 1 : index / (count - 1)
