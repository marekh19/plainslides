const INTEGER = /^-?\d+$/

/**
 * Groups `[data-step]` elements by their order value. A step without a value
 * gets the next number after the highest number before it in document order,
 * so it forms its own group.
 */
export const collectStepGroups = (
  slide: Element,
): readonly (readonly HTMLElement[])[] => {
  const steps = [...slide.querySelectorAll<HTMLElement>('[data-step]')]
  const groups = new Map<number, HTMLElement[]>()
  steps.reduce((highest, step) => {
    const raw = step.dataset.step?.trim() ?? ''
    const order = INTEGER.test(raw) ? Number(raw) : highest + 1
    groups.set(order, [...(groups.get(order) ?? []), step])
    return Math.max(highest, order)
  }, 0)
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, elements]) => elements)
}

export const isIntegerStep = (value: string) =>
  value.trim() === '' || INTEGER.test(value.trim())

export type StepState = 'hidden' | 'visible' | 'current'

/** State of the group at `groupIndex` when `revealed` groups are visible. */
export const stepState = (groupIndex: number, revealed: number): StepState => {
  if (groupIndex >= revealed) return 'hidden'
  return groupIndex === revealed - 1 ? 'current' : 'visible'
}
