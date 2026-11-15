import { afterEach } from 'vitest'
import { destroyDecks } from './test-utils'

// Node 26 defines a global localStorage that is undefined without
// --localstorage-file, and it hides the happy-dom storage.
if (window.localStorage === undefined) {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: new Storage(),
  })
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: window.localStorage,
  })
}

afterEach(destroyDecks)
