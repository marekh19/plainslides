/**
 * Records the original value of every attribute, CSS property, and content
 * the library changes, so `destroy()` can restore the page.
 */
export interface Writer {
  attr(element: Element, name: string, value: string | boolean | null): void
  prop(element: HTMLElement, name: string, value: string | null): void
  content(element: Element, nodes: readonly (Node | string)[]): void
  restore(): void
}

export const createWriter = (): Writer => {
  const attrs = new Map<Element, Map<string, string | null>>()
  const props = new Map<HTMLElement, Map<string, string>>()
  const contents = new Map<Element, string>()

  const remember = <E, V>(
    store: Map<E, Map<string, V>>,
    element: E,
    name: string,
    read: () => V,
  ) => {
    const known = store.get(element) ?? new Map<string, V>()
    if (!known.has(name)) known.set(name, read())
    store.set(element, known)
  }

  return {
    attr(element, name, value) {
      remember(attrs, element, name, () => element.getAttribute(name))
      if (value === null || value === false) {
        element.removeAttribute(name)
        return
      }
      const text = value === true ? '' : value
      if (element.getAttribute(name) !== text) element.setAttribute(name, text)
    },
    prop(element, name, value) {
      remember(props, element, name, () => element.style.getPropertyValue(name))
      if (value === null) element.style.removeProperty(name)
      else element.style.setProperty(name, value)
    },
    content(element, nodes) {
      if (!contents.has(element)) contents.set(element, element.innerHTML)
      element.replaceChildren(...nodes)
    },
    restore() {
      attrs.forEach((known, element) =>
        known.forEach((value, name) =>
          value === null
            ? element.removeAttribute(name)
            : element.setAttribute(name, value),
        ),
      )
      props.forEach((known, element) =>
        known.forEach((value, name) =>
          value === ''
            ? element.style.removeProperty(name)
            : element.style.setProperty(name, value),
        ),
      )
      contents.forEach((html, element) => {
        element.innerHTML = html
      })
      attrs.clear()
      props.clear()
      contents.clear()
    },
  }
}
