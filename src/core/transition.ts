export interface RunningTransition {
  /** Jumps every animation to its end state and completes at once. */
  finish(): void
}

/** Finite animations only: a looping spinner in a slide never finishes. */
const animationsOf = (elements: readonly Element[]) =>
  elements
    .flatMap((element) =>
      typeof element.getAnimations === 'function'
        ? element.getAnimations({ subtree: true })
        : [],
    )
    .filter(
      (animation) =>
        animation.effect?.getComputedTiming().iterations !== Infinity,
    )

/**
 * Waits for all animations on the elements and their descendants, or for the
 * timeout. Calls `onDone` once, with false when there were no animations.
 * `getAnimations` flushes styles, so animations that the new attributes
 * start are already included.
 */
export const runTransition = (
  elements: readonly Element[],
  timeout: number,
  onDone: (animated: boolean) => void,
): RunningTransition => {
  const animations = animationsOf(elements)
  if (animations.length === 0) {
    onDone(false)
    return { finish: () => undefined }
  }
  let done = false
  const complete = () => {
    if (done) return
    done = true
    clearTimeout(timer)
    onDone(true)
  }
  const timer = setTimeout(complete, timeout)
  void Promise.all(
    animations.map((animation) => animation.finished.catch(() => undefined)),
  ).then(complete)
  return {
    finish() {
      if (done) return
      animations.forEach((animation) => {
        try {
          animation.finish()
        } catch {
          // Infinite animations cannot finish. Removing the attributes ends them.
        }
      })
      complete()
    },
  }
}
