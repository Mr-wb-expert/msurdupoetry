# Design — Professor Mujahid Sajjad

A locked design system for this app. Every page reads this file before emitting code.
Do not regenerate per page — extend or amend this file when the system needs to grow.

Language: **English only.** RTL, Nastaliq and the language switch are removed — a second
undocumented language was the site's main structural liability.

## Genre

editorial

## Macrostructure family

**Long Document** for every page: asymmetric text-led bands, one idea per band, hairline
dividers instead of nested card boxes. Pages vary by band shape, not by theme.

- Home:        asymmetric portrait+text hero → featured book (large cover) → publication
               ledger → bio prose band → contact band
- Books:       ledger list + cover grid, category chips
- Book detail: cover + facts ledger, then "also in the library" ledger
- About:       portrait + bio, then long-form prose, then publications table
- Contact:     split details / form

## Theme

Kept from the existing system (it was already coherent); contrast failures corrected.

- `--color-paper`     `#fffdf8` warm paper
- `--color-cream-50`  `#fbf8f1` raised band
- `--color-cream-100` `#f6f1e5` deeper band
- `--color-ink-900`   `#0f1e38` primary ink / dark bands
- `--color-ink-700`   `#1e3a63` secondary ink
- `--color-muted`     `#5b6270` body-muted text (was `#6d7480` — 4.4:1, failed AA)
- `--color-line`      `#e6e0d3` hairline
- `--color-gold-500`  `#b08d4f` rules, accents
- `--color-gold-600`  `#96743c` focus ring (gold-500 is 2.93:1 on cream-50, below the 3:1 minimum)
- `--color-gold-700`  `#7a5c2c` small gold text on paper (was `gold-600`, 4.2:1)
- `--color-gold-300`  `#d8c08a` gold text on ink bands

Accent budget: ≤ 5 % of any viewport. Gold is rules, small caps labels, focus rings.

## Typography

- Display: **Newsreader**, weights 400/500, style roman. Italic headings are banned.
- Body:    **Inter**, weights 400/500/600.
- Display tracking: `-0.015em` at large sizes.
- Scale: `text-display` = `clamp(2.5rem, 1.6rem + 3.4vw, 4rem)`; h2 `clamp(1.75rem, 1.4rem + 1.2vw, 2.5rem)`;
  body `1.0625rem` / 1.75 measure cap at `max-w-[62ch]`.
- Body copy is serif-adjacent neutral; no Inter-only typing.

## Spacing

Tailwind default 4-pt scale. Section bands: `py-20 sm:py-24`. Never arbitrary pixel gaps.

## Motion

- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` only. Duration 180–320 ms.
- Reveal: fade + 12 px rise, once, via `Reveal`. No bounce, no overshoot.
- Reduced motion: opacity-only, ≤ 150 ms, honoured in `globals.css`.

## Microinteractions stance

- Silent. No toasts, no celebration.
- Hover: colour + 1 px border shift. Cards lift 3 px, never more.
- No `transition-all`. Focus rings are never transitioned.

## CTA voice

- Primary: ink-900 fill, `rounded-sm`, `min-h-12`, px-6, 14 px medium label, icon 16 px.
- Secondary: 1 px `ink-900/25` border, transparent fill, same height and padding.
- Tertiary link: gold bottom border, 14 px medium.
- Every CTA label is `whitespace-nowrap`.

## Surfaces

One rule, no exceptions: **the page is paper; raised bands are cream; cards are paper with a
hairline.** Pure `#ffffff` is used only for form controls. Never white on cream.

Elevation: one token, `--shadow-lift`. No inline `rgba(15,30,56,…)` shadows.

## Eyebrows

Small caps + gold-700. **At most one per band**, and never a restatement of the heading
directly beneath it. No tag-left / heading-right section heads — headings stack vertically.

## What pages MUST share

- The wordmark: navy square with a gold `MS` monogram, name in Newsreader beside it.
- The accent colour and its budget.
- Display + body pairings.
- CTA voice.
- Band padding rhythm (`py-20 sm:py-24`) and hairline dividers.

## What pages MAY differ on

- Band order and asymmetry ratio.
- Hero archetype (portrait-led on home and about, cover-led on book detail).
- Enrichment — typography only, plus the real portrait and cover photography.

## Accessibility floor

- Every interactive element ≥ 44 px in its smallest dimension.
- `:focus-visible` ring is never removed; no `focus:outline-none`.
- Dialogs trap focus and restore it to the trigger on close.
- Skip link target carries `tabIndex={-1}`.
- Verified at 320 / 375 / 414 / 768 px: no horizontal scroll, no two-line CTA labels.

## Exports

`app/globals.css` holds the Tailwind v4 `@theme` token block. There is no separate
`tokens.css` — Next.js consumes `@theme` directly.