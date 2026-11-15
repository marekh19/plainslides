import { describe, expect, it } from 'vitest'
import { createWriter } from './writer'

describe('createWriter', () => {
  it('restores attributes, properties, and content', () => {
    const element = document.createElement('div')
    element.setAttribute('role', 'note')
    element.style.setProperty('--a', '1')
    element.innerHTML = '<b>original</b>'
    const writer = createWriter()

    writer.attr(element, 'role', 'group')
    writer.attr(element, 'data-x', true)
    writer.attr(element, 'data-x', 'two')
    writer.attr(element, 'hidden', false)
    writer.prop(element, '--a', '2')
    writer.prop(element, '--b', '3')
    writer.prop(element, '--b', null)
    writer.content(element, ['text'])
    writer.content(element, ['again'])
    expect(element.getAttribute('data-x')).toBe('two')
    expect(element.textContent).toBe('again')

    writer.restore()
    expect(element.getAttribute('role')).toBe('note')
    expect(element.hasAttribute('data-x')).toBe(false)
    expect(element.style.getPropertyValue('--a')).toBe('1')
    expect(element.style.getPropertyValue('--b')).toBe('')
    expect(element.innerHTML).toBe('<b>original</b>')
  })
})
