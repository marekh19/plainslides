import { listen, queryAll } from '../core/dom'
import { createWriter } from '../core/writer'
import type { Plugin } from '../types'

export interface FitOptions {
  /** Target thumbnail width in overview mode, in CSS pixels. Default 320. */
  thumbWidth?: number
  /** Space between and around overview thumbnails, in CSS pixels. Default 16. */
  overviewGap?: number
}

/** Scale and offset that fit the canvas into the available area. */
export const fitStage = (
  canvas: { width: number; height: number },
  available: { width: number; height: number },
) => {
  const scale = Math.max(
    Math.min(available.width / canvas.width, available.height / canvas.height),
    0,
  )
  return {
    scale,
    x: (available.width - canvas.width * scale) / 2,
    y: (available.height - canvas.height * scale) / 2,
  }
}

/** Columns and thumbnail scale for overview mode. */
export const fitThumbnails = (
  canvasWidth: number,
  availableWidth: number,
  thumbWidth: number,
  gap: number,
) => {
  const columns = Math.max(
    Math.floor((availableWidth - gap) / (thumbWidth + gap)),
    1,
  )
  const width = (availableWidth - gap * (columns + 1)) / columns
  return { columns, scale: Math.max(width, 0) / canvasWidth }
}

/**
 * Scales the stage to the window. Writes `--deck-scale`, `--deck-x`,
 * `--deck-y`, and the overview variables `--deck-thumb-scale`,
 * `--deck-thumb-columns`, and `--deck-overview-gap`. A visible
 * `[data-deck-notes-panel]` reduces the available height.
 */
export const fit =
  (options: FitOptions = {}): Plugin =>
  (deck) => {
    const { thumbWidth = 320, overviewGap = 16 } = options
    const { root } = deck
    const doc = root.ownerDocument
    const win = doc.defaultView
    if (!win) return
    const writer = createWriter()

    const update = () => {
      const reserved = queryAll(doc, '[data-deck-notes-panel]')
        .filter((panel) => !panel.hidden)
        .reduce((sum, panel) => sum + panel.getBoundingClientRect().height, 0)
      const width = doc.documentElement.clientWidth || win.innerWidth
      const height = Math.max(win.innerHeight - reserved, 0)
      const stage = fitStage(deck.size, { width, height })
      const thumbs = fitThumbnails(
        deck.size.width,
        width,
        thumbWidth,
        overviewGap,
      )
      writer.prop(root, '--deck-scale', String(stage.scale))
      writer.prop(root, '--deck-x', `${stage.x}px`)
      writer.prop(root, '--deck-y', `${stage.y}px`)
      writer.prop(root, '--deck-thumb-scale', String(thumbs.scale))
      writer.prop(root, '--deck-thumb-columns', String(thumbs.columns))
      writer.prop(root, '--deck-overview-gap', `${overviewGap}px`)
    }

    const observer =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(update)
        : undefined
    observer?.observe(doc.documentElement)
    queryAll(doc, '[data-deck-notes-panel]').forEach((panel) =>
      observer?.observe(panel),
    )
    let active = true
    void doc.fonts?.ready.then(() => active && update())
    const cleanups = [
      listen(win, 'resize', update),
      // Wait until every mode listener has run: the notes plugin shows its
      // panel in its own listener, after this one.
      deck.on('mode', () => queueMicrotask(() => active && update())),
    ]
    update()

    return () => {
      active = false
      observer?.disconnect()
      cleanups.forEach((cleanup) => cleanup())
      writer.restore()
    }
  }
