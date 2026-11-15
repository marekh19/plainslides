// Writes the CSS strings from src/styles to dist, for authors who turn off
// injection and for the `plainslides/layout.css` export.
import { writeFileSync } from 'node:fs'
import { layoutCss } from '../src/styles/layout.ts'
import { structureCss } from '../src/styles/structure.ts'

writeFileSync(new URL('../dist/structure.css', import.meta.url), structureCss)
writeFileSync(new URL('../dist/layout.css', import.meta.url), layoutCss)
