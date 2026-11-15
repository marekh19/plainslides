import { pathToFileURL } from 'node:url'
import { expect, type Page, test } from '@playwright/test'

const url = pathToFileURL(
  new URL('../../examples/starter/index.html', import.meta.url).pathname,
).href

const open = async (page: Page, hash = '') => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') {
      errors.push(message.text())
    }
  })
  await page.goto(url + hash)
  await expect(page.locator('[data-deck]')).toHaveAttribute('data-count', '15')
  return errors
}

const active = (page: Page) => page.locator('[data-slide][data-state="active"]')

const settle = (page: Page) =>
  expect(page.locator('[data-deck]')).not.toHaveAttribute('data-transitioning')

test('loads from file:// without errors or warnings', async ({ page }) => {
  const errors = await open(page)
  await expect(active(page)).toHaveAttribute('id', 'title')
  await expect(page).toHaveURL(/#title$/)
  expect(errors).toEqual([])
})

test('navigates with keys and writes the hash', async ({ page }) => {
  await open(page)
  await page.keyboard.press('ArrowRight')
  await expect(active(page)).toHaveAttribute('id', 'agenda')
  await page.keyboard.press('End')
  await expect(active(page)).toHaveAttribute('id', 'end')
  await page.keyboard.press('Home')
  await expect(active(page)).toHaveAttribute('id', 'title')
  await expect(page).toHaveURL(/#title$/)
  await expect(
    page.locator('[data-slide]:not([data-state="active"])').first(),
  ).toHaveAttribute('inert', '')
})

test('opens the slide and step from the hash', async ({ page }) => {
  await open(page, '#stats.2')
  await expect(active(page)).toHaveAttribute('id', 'stats')
  const steps = page.locator('#stats [data-step]')
  await expect(steps.nth(0)).toHaveAttribute('data-step-state', 'visible')
  await expect(steps.nth(1)).toHaveAttribute('data-step-state', 'current')
  await expect(steps.nth(2)).toHaveAttribute('data-step-state', 'hidden')
  await expect(steps.nth(2)).toBeHidden()
})

test('reveals and hides steps before changing slides', async ({ page }) => {
  await open(page, '#stats')
  const steps = page.locator('#stats [data-step]')
  await expect(steps.nth(0)).toBeHidden()
  await page.keyboard.press('ArrowRight')
  await expect(steps.nth(0)).toBeVisible()
  await expect(page).toHaveURL(/#stats\.1$/)
  await page.keyboard.press('ArrowLeft')
  await expect(steps.nth(0)).toBeHidden()
  await page.keyboard.press('ArrowLeft')
  await expect(active(page)).toHaveAttribute('id', 'numbers')
})

test('navigates with click zones and swipes', async ({ page }) => {
  await open(page)
  const box = await page.locator('[data-deck]').boundingBox()
  if (!box) throw new Error('No deck box')
  await page.mouse.click(box.x + box.width * 0.8, box.y + box.height / 2)
  await expect(active(page)).toHaveAttribute('id', 'agenda')
  await settle(page)
  await page.mouse.click(box.x + box.width * 0.1, box.y + box.height / 2)
  await expect(active(page)).toHaveAttribute('id', 'title')
  await settle(page)
  await page.evaluate(() => {
    const root = document.querySelector('[data-deck]')
    const touch = (type: string, clientX: number) =>
      root?.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerType: 'touch',
          isPrimary: true,
          clientX,
          clientY: 300,
        }),
      )
    touch('pointerdown', 700)
    touch('pointerup', 500)
  })
  await expect(active(page)).toHaveAttribute('id', 'agenda')
})

test('runs slide transitions and finishes them on fast input', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await open(page)
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('#title')).toHaveAttribute('data-leaving', 'fade')
  await expect(page.locator('#agenda')).toHaveAttribute('data-entering', 'fade')
  await settle(page)
  await expect(page.locator('#title')).not.toHaveAttribute('data-leaving')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(active(page)).toHaveAttribute('id', 'stats')
  await settle(page)
  await expect(page.locator('[data-leaving]')).toHaveCount(0)
})

test('skips transition animations under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const errors = await open(page)
  await page.keyboard.press('ArrowRight')
  await expect(active(page)).toHaveAttribute('id', 'agenda')
  await expect(page.locator('[data-deck]')).not.toHaveAttribute(
    'data-transitioning',
  )
  expect(errors).toEqual([])
})

test('shows the overview and opens a slide from it', async ({ page }) => {
  await open(page)
  await page.keyboard.press('o')
  const root = page.locator('[data-deck]')
  await expect(root).toHaveAttribute('data-mode-overview', '')
  await expect(page.locator('#table')).toBeVisible()
  await expect(page.locator('#stats [data-step]').first()).toBeVisible()
  await page.locator('#quote').click()
  await expect(root).not.toHaveAttribute('data-mode-overview')
  await expect(active(page)).toHaveAttribute('id', 'quote')
  await page.keyboard.press('o')
  await expect(page.locator('#quote')).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('#cards')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(root).not.toHaveAttribute('data-mode-overview')
  await expect(active(page)).toHaveAttribute('id', 'cards')
})

test('turns on overview on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 800 })
  await open(page)
  await expect(page.locator('[data-deck]')).toHaveAttribute(
    'data-mode-overview',
    '',
  )
})

test('shows the notes panel and shrinks the stage', async ({ page }) => {
  await open(page)
  const panel = page.locator('[data-deck-notes-panel]')
  await expect(panel).toBeHidden()
  const before = await page.locator('[data-deck]').boundingBox()
  await page.keyboard.press('n')
  await expect(panel).toBeVisible()
  await expect(page.locator('[data-deck-notes-text]')).toContainText(
    'every recipe',
  )
  await expect(page.locator('[data-deck-notes-text] strong')).toHaveCount(1)
  await expect(panel.locator('[data-deck-next-title]')).toHaveText('Agenda')
  const after = await page.locator('[data-deck]').boundingBox()
  expect(after?.height ?? 0).toBeLessThan(before?.height ?? 0)
})

test('opens the presenter window and keeps it in sync', async ({ page }) => {
  await open(page)
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.keyboard.press('s'),
  ])
  await expect(page.locator('[data-deck]')).toHaveAttribute(
    'data-mode-presenter',
    '',
  )
  const current = popup.locator('[data-deck-presenter-current] h1')
  await expect(current).toHaveText('Slides that agents can build')
  await expect(popup.locator('[data-deck-presenter-next] h2')).toHaveText(
    'Agenda',
  )
  await expect(popup.locator('[data-deck-notes-text]')).toContainText(
    'every recipe',
  )
  await popup.keyboard.press('ArrowRight')
  await expect(active(page)).toHaveAttribute('id', 'agenda')
  await expect(popup.locator('[data-deck-presenter-current] h2')).toHaveText(
    'Agenda',
  )
  await popup.close()
  await expect(page.locator('[data-deck]')).not.toHaveAttribute(
    'data-mode-presenter',
  )
})

test('prints one slide per page with every step', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')))
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('[data-deck]')).toHaveAttribute('data-printing', '')
  await expect(page.locator('#table')).toBeVisible()
  await expect(page.locator('#stats [data-step]').last()).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')))
  await page.emulateMedia({ media: 'screen' })
  await expect(page.locator('#table')).toBeHidden()
})

test('prints full-size slides from overview', async ({ page }) => {
  await open(page)
  await page.keyboard.press('o')
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')))
  await page.emulateMedia({ media: 'print' })
  const box = await page.locator('#table').boundingBox()
  expect(Math.round(box?.width ?? 0)).toBe(1600)
})

test('stores the theme choice', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await open(page)
  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await page.keyboard.press('t')
  await expect(html).toHaveAttribute('data-theme', 'light')
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'light')
})

test('renders the chart widget and the key list', async ({ page }) => {
  await open(page, '#hero')
  await expect(page.locator('#hero figure svg rect')).toHaveCount(2)
  await expect(page.locator('[data-deck-keys] li').first()).toContainText(
    'Next',
  )
  await page.keyboard.press('?')
  await expect(page.locator('[data-deck]')).toHaveAttribute(
    'data-mode-help',
    '',
  )
})

test('draws no focus ring on the root after focus falls back to it', async ({
  page,
}) => {
  await open(page)
  await page.keyboard.press('o')
  await page.keyboard.press('Enter')
  const root = page.locator('[data-deck]')
  await expect(root).toBeFocused()
  await expect(root).toHaveCSS('outline-style', 'none')
})
