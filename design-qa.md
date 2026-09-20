# design qa

- reference: `/var/folders/v1/9qbjkfqs76b_fbdb3_l14w200000gq/T/codex-clipboard-7a42bd2d-5d94-4808-9d34-32d7bd1d93bf.png`
- implementation: `design-qa-implementation.jpg`
- comparison: `design-qa-comparison.png`
- viewport: 1644 × 1130 desktop and 390 × 844 mobile, light theme, anonymous article view
- route: `/articles/architecture-decisions`

## checks

- the real arkivel svg is used in the shell and favicon; no placeholder letter mark remains.
- `folio` keeps the reference's neutral three-pane hierarchy while filling the viewport without the inset frame.
- `wiki` retains the classic palette, border, rounded frame, and shadow on the same page components.
- the article view contains only the title, body, graph or outline, and the compact persistent shell controls.
- headings, the documented api symbol, graph labels, and navigation text render without clipping.
- desktop and mobile have no horizontal overflow; the mobile navigation and page-context controls both open and close.
- the product page keeps the lowercase neutral brand direction and the generated four-operation read api reference.

Intentional differences from the reference are the full-viewport Folio frame, compact typography, and bottom utility rail. The classic inset frame remains available as the Wiki skin.

final result: passed
