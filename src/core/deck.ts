import { structureCss } from '../styles/structure'
import type {
  Deck,
  DeckIssue,
  DeckOptions,
  GoOptions,
  Plugin,
  SlideInfo,
} from '../types'
import { createCommands, createKeymap } from './commands'
import { injectStyle, isLocal } from './dom'
import { createEmitter } from './emitter'
import {
  directionOf,
  nextPosition,
  type Position,
  prevPosition,
  progressOf,
  resolve,
} from './navigation'
import { buildSections, buildSlides, resolveSize } from './registry'
import { stepState } from './steps'
import { runTransition, type RunningTransition } from './transition'
import { coreIssues } from './validate'
import { createWriter } from './writer'

/** Modes that show every slide and every step. */
const SHOW_ALL = ['overview', 'print']

const LIVE_STYLE =
  'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0'

/**
 * Creates a deck from a root element whose `[data-slide]` children are the
 * slides. The core handles navigation, steps, transitions, and slide
 * semantics. Everything else is a plugin; see `start()` for the defaults.
 */
export const createDeck = (
  root: HTMLElement,
  options: DeckOptions = {},
): Deck => {
  const doc = root.ownerDocument
  const win = doc.defaultView
  const writer = createWriter()
  const emitter = createEmitter()
  const commands = createCommands()
  const keymap = createKeymap(commands)
  const size = resolveSize(root, options)
  const slides = buildSlides(root)
  const sections = buildSections(slides)
  const counts = slides.map((slide) => slide.stepGroups.length)
  const timeout = options.transitionTimeout ?? 1000
  const warnings = options.warnings ?? (win ? isLocal(win.location) : false)
  const checks = new Set<() => readonly DeckIssue[]>()
  const plugins = new Set<() => void>()
  const modes = new Set<string>()
  const warned = new Set<string>()

  let position: Position = resolve(counts, 0)
  let running: RunningTransition | undefined
  let destroyed = false

  const removeStyles =
    options.injectStyles === false
      ? undefined
      : injectStyle(doc, 'data-deck-styles', structureCss)

  const live = doc.createElement('div')
  live.setAttribute('data-deck-live', '')
  live.setAttribute('aria-live', 'polite')
  live.setAttribute('aria-atomic', 'true')
  live.setAttribute('style', LIVE_STYLE)
  doc.body.append(live)

  const warn = (message: string) => {
    if (!warnings || warned.has(message)) return
    warned.add(message)
    // Warnings are the validation feedback channel for authors and agents.
    // oxlint-disable-next-line no-console
    console.warn(`[plainslides] ${message}`)
  }

  const label = (slide: SlideInfo) =>
    `${slide.index + 1} of ${slides.length}: ${slide.title}`

  // Static semantics and sizes.
  writer.attr(root, 'aria-roledescription', 'slide deck')
  if (!root.hasAttribute('tabindex')) writer.attr(root, 'tabindex', '-1')
  writer.attr(root, 'data-count', String(slides.length))
  writer.prop(root, '--deck-width', `${size.width}px`)
  writer.prop(root, '--deck-height', `${size.height}px`)
  writer.prop(root, '--deck-count', String(slides.length))
  slides.forEach((slide) => {
    writer.attr(slide.element, 'role', 'group')
    writer.attr(slide.element, 'aria-roledescription', 'slide')
    writer.attr(slide.element, 'aria-label', label(slide))
    writer.prop(slide.element, '--slide-index', String(slide.index + 1))
    slide.stepGroups.forEach((group, groupIndex) =>
      group.forEach((step) =>
        writer.prop(step, '--step-index', String(groupIndex + 1)),
      ),
    )
  })

  const revealedOn = (slide: SlideInfo) => {
    const total = slide.stepGroups.length
    if (SHOW_ALL.some((name) => modes.has(name))) return total
    if (slide.index === position.index) return position.step
    return slide.index < position.index ? total : 0
  }

  const render = () => {
    writer.attr(root, 'data-index', String(position.index + 1))
    writer.prop(root, '--deck-index', String(position.index + 1))
    writer.prop(
      root,
      '--deck-progress',
      String(progressOf(position.index, slides.length)),
    )
    slides.forEach((slide) => {
      const { element } = slide
      const active = slide.index === position.index
      writer.attr(
        element,
        'data-state',
        active ? 'active' : slide.index < position.index ? 'past' : 'future',
      )
      writer.attr(element, 'aria-current', active ? 'true' : null)
      writer.attr(element, 'inert', !active && !modes.has('overview'))
      // A leaving slide keeps its steps until the transition ends.
      if (element.hasAttribute('data-leaving')) return
      const revealed = revealedOn(slide)
      const showAll = SHOW_ALL.some((name) => modes.has(name))
      slide.stepGroups.forEach((group, groupIndex) => {
        // Only the active slide has a current step; overview and print show
        // every step without a highlight.
        const state =
          showAll || slide.index !== position.index
            ? groupIndex < revealed
              ? 'visible'
              : 'hidden'
            : stepState(groupIndex, revealed)
        group.forEach((step) => {
          writer.attr(step, 'data-step-state', state)
          writer.attr(step, 'aria-hidden', state === 'hidden' ? 'true' : null)
          writer.attr(step, 'inert', state === 'hidden')
        })
      })
    })
  }

  /** Renders, then moves focus to the root if it ended up inside inert content. */
  const renderKeepingFocus = () => {
    const focused = doc.activeElement
    render()
    if (focused instanceof HTMLElement && focused.closest('[inert]')) {
      root.focus({ preventScroll: true })
    }
  }

  const reducedMotion = () =>
    win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

  const transitionName = (slide: SlideInfo) =>
    slide.transition ??
    (root.getAttribute('data-transition')?.trim() || undefined)

  const change = (target: Position, allowTransition = true) => {
    if (destroyed) return
    const from = position
    // A repeated request for the same position, such as popstate followed by
    // hashchange, must not cut the running transition short.
    if (target.index === from.index && target.step === from.step) return
    running?.finish()
    const direction = directionOf(from, target)
    const leaving = slides[from.index]
    const entering = slides[target.index]
    position = target
    const payload = {
      index: target.index,
      step: target.step,
      previousIndex: from.index,
      previousStep: from.step,
      direction,
    }

    if (target.index === from.index || !leaving || !entering) {
      renderKeepingFocus()
      emitter.emit('change', payload)
      emitter.emit('step', {
        index: target.index,
        step: target.step,
        direction,
      })
      return
    }

    const name = transitionName(entering)
    const animate =
      allowTransition &&
      name !== undefined &&
      name !== 'none' &&
      !SHOW_ALL.some((mode) => modes.has(mode))

    writer.attr(root, 'data-direction', direction)
    if (animate) {
      writer.attr(root, 'data-transitioning', true)
      writer.attr(leaving.element, 'data-leaving', name)
      writer.attr(entering.element, 'data-entering', name)
    }
    renderKeepingFocus()
    live.textContent = `Slide ${label(entering)}`
    emitter.emit('change', payload)

    if (!animate) {
      emitter.emit('settled', { index: target.index })
      return
    }
    let finished = false
    const transition = runTransition(
      [leaving.element, entering.element],
      timeout,
      (animated) => {
        finished = true
        running = undefined
        writer.attr(root, 'data-transitioning', null)
        writer.attr(leaving.element, 'data-leaving', null)
        writer.attr(entering.element, 'data-entering', null)
        renderKeepingFocus()
        if (!animated && !reducedMotion()) {
          warn(
            `Transition "${name}" runs no animation. Add CSS keyframes for [data-entering="${name}"] or [data-leaving="${name}"], or use data-transition="none".`,
          )
        }
        emitter.emit('settled', { index: target.index })
      },
    )
    // Without animations, runTransition completes before it returns.
    if (!finished) running = transition
  }

  const setMode = (name: string, on: boolean) => {
    if (destroyed || modes.has(name) === on) return
    if (on) modes.add(name)
    else modes.delete(name)
    writer.attr(root, `data-mode-${name}`, on)
    if (on && SHOW_ALL.includes(name)) running?.finish()
    renderKeepingFocus()
    emitter.emit('mode', { name, on })
  }

  const deck: Deck = {
    root,
    slides,
    sections,
    size,
    get index() {
      return position.index
    },
    get step() {
      return position.step
    },
    get transitioning() {
      return running !== undefined
    },
    go(target, goOptions: GoOptions = {}) {
      const index =
        typeof target === 'string'
          ? slides.findIndex((slide) => slide.id === target)
          : target
      // An unknown id does nothing; numbers out of range clamp.
      if ((typeof target === 'string' && index < 0) || Number.isNaN(index)) {
        return
      }
      change(resolve(counts, index, goOptions.step), goOptions.transition)
    },
    // Overview shows every step, so arrows move by whole slides there.
    next: () =>
      change(
        modes.has('overview')
          ? resolve(counts, position.index + 1)
          : nextPosition(counts, position),
      ),
    prev: () =>
      change(
        modes.has('overview')
          ? resolve(counts, position.index - 1)
          : prevPosition(counts, position),
      ),
    first: () => deck.go(0),
    last: () => deck.go(slides.length - 1),
    mode: (name) => modes.has(name),
    setMode,
    toggleMode: (name) => setMode(name, !modes.has(name)),
    run: (name) => commands.get(name)?.run(),
    commands,
    keymap,
    on: emitter.on,
    emit: emitter.emit,
    validate: () => [
      ...coreIssues(root, slides, keymap),
      ...[...checks].flatMap((check) => check()),
    ],
    addCheck(check) {
      checks.add(check)
      return () => {
        checks.delete(check)
      }
    },
    warn,
    use(plugin: Plugin) {
      if (destroyed) return () => undefined
      const cleanup = plugin(deck) ?? (() => undefined)
      let removed = false
      const remove = () => {
        if (removed) return
        removed = true
        plugins.delete(remove)
        cleanup()
      }
      plugins.add(remove)
      return remove
    },
    destroy() {
      if (destroyed) return
      running?.finish()
      ;[...plugins].reverse().forEach((remove) => remove())
      destroyed = true
      writer.restore()
      live.remove()
      removeStyles?.()
      emitter.clear()
      checks.clear()
    },
  }

  commands.register('next', { label: 'Next', run: () => deck.next() })
  commands.register('prev', { label: 'Previous', run: () => deck.prev() })
  commands.register('first', { label: 'First slide', run: () => deck.first() })
  commands.register('last', { label: 'Last slide', run: () => deck.last() })

  render()
  options.plugins?.forEach((plugin) => deck.use(plugin))
  return deck
}
