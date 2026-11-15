// Puts the IIFE build next to the starter example, as authors do.
import { copyFileSync } from 'node:fs'

copyFileSync(
  new URL('../dist/index.iife.js', import.meta.url),
  new URL('../examples/starter/plainslides.iife.js', import.meta.url),
)
