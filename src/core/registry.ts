import type { SectionInfo, SlideInfo } from '../types'
import { collectStepGroups } from './steps'

const DEFAULT_WIDTH = 1600
const DEFAULT_HEIGHT = 900

const text = (element: Element | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim() || undefined

const attr = (element: HTMLElement, name: string) =>
  element.getAttribute(name)?.trim() || undefined

/** A positive finite number, or undefined. */
export const positive = (value: string | null | undefined) => {
  if (value === null || value === undefined || value.trim() === '') return
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

/** Option, then root attribute, then the default. */
export const resolveSize = (
  root: HTMLElement,
  options: { width?: number | undefined; height?: number | undefined },
) => ({
  width:
    positive(String(options.width ?? '')) ??
    positive(root.dataset.width) ??
    DEFAULT_WIDTH,
  height:
    positive(String(options.height ?? '')) ??
    positive(root.dataset.height) ??
    DEFAULT_HEIGHT,
})

/** Content outside speaker notes, so a heading in the notes is not a title. */
const firstOutsideNotes = (slide: HTMLElement, selector: string) =>
  [...slide.querySelectorAll(selector)].find(
    (element) => !element.closest('[data-notes]'),
  )

/** The title from the slide's content, or undefined. */
export const ownTitle = (slide: HTMLElement) =>
  attr(slide, 'data-title') ??
  text(firstOutsideNotes(slide, 'h1, h2')) ??
  text(firstOutsideNotes(slide, '[data-role="eyebrow"]'))

const slideTitle = (slide: HTMLElement, index: number) =>
  ownTitle(slide) ?? `Slide ${index + 1}`

const findSlides = (root: HTMLElement) =>
  [...root.children].filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.hasAttribute('data-slide'),
  )

export const buildSlides = (root: HTMLElement): readonly SlideInfo[] =>
  findSlides(root).map((element, index) => ({
    element,
    index,
    id: element.id || undefined,
    title: slideTitle(element, index),
    duration: positive(element.dataset.duration),
    section: attr(element, 'data-section'),
    subsection: attr(element, 'data-subsection'),
    transition: attr(element, 'data-transition'),
    notes: element.querySelector<HTMLElement>('[data-notes]') ?? undefined,
    stepGroups: collectStepGroups(element),
  }))

type Range = { name: string; start: number; end: number }

const ranges = (
  slides: readonly SlideInfo[],
  pick: (slide: SlideInfo) => string | undefined,
): readonly Range[] =>
  slides.reduce<readonly Range[]>((found, slide) => {
    const name = pick(slide)
    if (name === undefined) return found
    const existing = found.find((range) => range.name === name)
    return existing
      ? found.map((range) =>
          range === existing ? { ...range, end: slide.index } : range,
        )
      : [...found, { name, start: slide.index, end: slide.index }]
  }, [])

export const buildSections = (
  slides: readonly SlideInfo[],
): readonly SectionInfo[] =>
  ranges(slides, (slide) => slide.section).map((section) => ({
    ...section,
    subsections: ranges(
      slides.filter((slide) => slide.section === section.name),
      (slide) => slide.subsection,
    ),
  }))
