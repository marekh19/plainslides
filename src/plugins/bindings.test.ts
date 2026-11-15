import { describe, expect, it } from 'vitest'
import { makeDeck } from '../test-utils'
import { bindings } from './bindings'
import { keyboard } from './keyboard'
import { notes } from './notes'

const tracker = `<ol data-deck-tracker>
  <li data-deck-tracker-item="Intro">Intro</li>
  <li data-deck-tracker-item="Body">Body</li>
  <li data-deck-tracker-item="Find">Find</li>
  <li data-deck-tracker-item="End">End</li>
</ol>`

const specs = [
  {
    title: 'One',
    attrs: { 'data-section': 'Intro' },
    html: `<span data-deck-page></span>${tracker}<aside data-notes><p>Say <b>hi</b></p></aside>`,
  },
  {
    title: 'Two',
    attrs: { 'data-section': 'Body', 'data-subsection': 'Find' },
    html: '<span data-deck-page></span>',
  },
  { title: 'Three', attrs: { 'data-section': 'End' } },
]

const outside = `<span id="page" data-deck-page></span>
<div id="progress" data-deck-progress></div>
<span id="section" data-deck-section></span>
<ol id="agenda" data-deck-agenda>
  <li data-deck-tracker-item="Intro"></li>
  <li data-deck-tracker-item="Body"></li>
  <li data-deck-tracker-item="Find"></li>
  <li data-deck-tracker-item="End"></li>
  <li data-deck-tracker-item="Missing"></li>
</ol>
<ul id="keys" data-deck-keys></ul>
<div id="keys-div" data-deck-keys></div>
<div id="panel" data-deck-notes-panel>
  <div id="notes" data-deck-notes-text></div>
  <span id="next" data-deck-next-title></span>
</div>`

const setup = (options = {}) => {
  const deck = makeDeck(specs, {
    plugins: [
      (target) => {
        document.body.insertAdjacentHTML('beforeend', outside)
        return keyboard()(target)
      },
      notes(),
      bindings(options),
    ],
  })
  const byId = (id: string) => document.getElementById(id)
  return { deck, byId }
}

const states = (list: HTMLElement | null) =>
  [...(list?.querySelectorAll<HTMLElement>('li') ?? [])].map(
    (item) => item.dataset.state,
  )

describe('bindings', () => {
  it('fills page numbers inside and outside slides', () => {
    const { deck, byId } = setup()
    const inside = [
      ...deck.root.querySelectorAll<HTMLElement>('[data-deck-page]'),
    ].map((element) => element.textContent)
    expect(inside).toEqual(['1 / 3', '2 / 3'])
    deck.next()
    expect(byId('page')?.textContent).toBe('2 / 3')
  })

  it('uses a custom page format', () => {
    const { byId } = setup({
      pageFormat: (number: number, count: number) => `${number} of ${count}`,
    })
    expect(byId('page')?.textContent).toBe('1 of 3')
  })

  it('fills progress and section', () => {
    const { deck, byId } = setup()
    deck.next()
    const progress = byId('progress')
    expect(progress?.style.getPropertyValue('--deck-progress')).toBe('0.5')
    expect(progress?.getAttribute('role')).toBe('progressbar')
    expect(progress?.getAttribute('aria-valuenow')).toBe('2')
    expect(progress?.getAttribute('aria-valuemax')).toBe('3')
    expect(progress?.getAttribute('aria-valuetext')).toBe('Slide 2 of 3')
    expect(byId('section')?.textContent).toBe('Body')
  })

  it('marks tracker and agenda items', () => {
    const { deck, byId } = setup()
    const inSlide = deck.root.querySelector<HTMLElement>('[data-deck-tracker]')
    expect(states(inSlide)).toEqual(['current', 'future', 'future', 'future'])
    deck.next()
    expect(states(inSlide)).toEqual(['current', 'future', 'future', 'future'])
    expect(states(byId('agenda'))).toEqual([
      'past',
      'current',
      'current',
      'future',
      'future',
    ])
    expect(
      byId('agenda')
        ?.querySelector('[aria-current="step"]')
        ?.getAttribute('data-deck-tracker-item'),
    ).toBe('Body')
  })

  it('renders the key list from the keymap', () => {
    const { deck, byId } = setup()
    const items = byId('keys')?.querySelectorAll('li') ?? []
    expect(items[0]?.textContent).toContain('Next')
    expect(items[0]?.querySelector('kbd')?.textContent).toBe('→')
    expect(
      byId('keys-div')?.querySelector('span[data-deck-key]'),
    ).not.toBeNull()
    deck.commands.register('extra', { label: 'Extra', run: () => undefined })
    deck.keymap.bind('x', 'extra')
    deck.setMode('help', true)
    expect(byId('keys')?.textContent).toContain('Extra')
  })

  it('fills notes and the next title, and toggles the panel', () => {
    const { deck, byId } = setup()
    expect(byId('notes')?.innerHTML).toBe('<p>Say <b>hi</b></p>')
    expect(byId('next')?.textContent).toBe('Two')
    expect(byId('panel')?.hidden).toBe(true)
    deck.run('notes')
    expect(byId('panel')?.hidden).toBe(false)
    deck.last()
    expect(byId('notes')?.innerHTML).toBe('')
    expect(byId('next')?.textContent).toBe('')
  })

  it('restores bindings on destroy', () => {
    const { deck, byId } = setup()
    deck.destroy()
    expect(byId('page')?.textContent).toBe('')
    expect(byId('progress')?.hasAttribute('role')).toBe(false)
  })
})
