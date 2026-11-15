// No imports: scripts/write-css.ts loads this file directly with Node.

/**
 * Structural CSS. Only position, size, and visibility; no colors, fonts,
 * spacing, or animations. Selectors are wrapped in `:where()` so any author
 * rule wins. Rules that hide content use `!important`, so an author rule such
 * as `[data-slide] { display: flex }` cannot show inactive slides. The root
 * never shows a focus ring: it only takes focus as a fallback, and a ring
 * around the whole stage tells the viewer nothing.
 */
export const structureCss = `:where([data-deck]){position:fixed;top:0;left:0;display:grid;box-sizing:border-box;width:var(--deck-width,1600px);height:var(--deck-height,900px);overflow:hidden;transform-origin:0 0;transform:translate(var(--deck-x,0px),var(--deck-y,0px)) scale(var(--deck-scale,1));touch-action:pan-y}
:where([data-deck]:focus){outline:none!important}
:where([data-deck]>[data-slide]){grid-area:1/1;box-sizing:border-box;width:100%;height:100%;min-width:0;min-height:0;overflow:hidden}
:where([data-deck]:not([data-mode-overview],[data-mode-print])>[data-slide]:not([data-state=active],[data-leaving])){display:none!important}
:where([data-notes],[data-deck-notes-panel][hidden]){display:none!important}
:where([data-deck][data-mode-overview]){position:static;grid-template-columns:repeat(var(--deck-thumb-columns,1),max-content);justify-content:center;gap:var(--deck-overview-gap,16px);width:auto;height:auto;padding:var(--deck-overview-gap,16px);overflow:visible;transform:none;touch-action:auto}
:where([data-deck][data-mode-overview]>[data-slide]){grid-area:auto;width:var(--deck-width,1600px);height:var(--deck-height,900px);zoom:var(--deck-thumb-scale,.2);cursor:pointer}
:where([data-deck][data-deck-preview]){position:relative;transform:scale(var(--deck-scale,1))}
@media print{:where([data-deck]){position:static;display:block;width:auto;height:auto;padding:0;overflow:visible;transform:none}:where([data-deck]>[data-slide]){width:var(--deck-width,1600px);height:var(--deck-height,900px);zoom:1;break-after:page;break-inside:avoid}}
`
