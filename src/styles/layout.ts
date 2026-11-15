// No imports: scripts/write-css.ts loads this file directly with Node.

export const LAYOUTS = ['row', 'col', 'grid', 'split', 'center', 'stack']

/** Layout helpers. Only layout properties and the gap. */
export const layoutCss = `:where([data-layout]){gap:var(--gap,1em)}
:where([data-layout=row]){display:flex;flex-direction:row}
:where([data-layout=col]){display:flex;flex-direction:column}
:where([data-layout=grid]){display:grid;grid-template-columns:repeat(var(--cols,2),minmax(0,1fr))}
:where([data-layout=split]){display:grid;grid-template-columns:var(--split,1fr 1fr)}
:where([data-layout=center]){display:grid;place-content:center;place-items:center}
:where([data-layout=stack]){display:grid}
:where([data-layout=stack]>*){grid-area:1/1}
:where([data-push]){margin-block-start:auto}
:where([data-grow]){flex:1;min-height:0}
`
