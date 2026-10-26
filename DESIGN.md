---
version: alpha
name: Sourced
description: >
  A professional document Q&A tool. Upload PDFs or text files, ask questions,
  get answers generated strictly from the uploaded content, with inline
  citations back to the source document and page number. Built for serious,
  everyday use (legal, ops, support, research), not a consumer chat toy.
---

## Overview

Sourced should feel like a precise, trustworthy instrument, closer to Linear
or a well-built internal admin tool than a consumer chat app. The emotional
tone is calm competence: nothing about the interface should make the user
doubt whether an answer is reliable. Every surface should feel quiet and
intentional, with a single point of visual emphasis per screen so the user's
eye always knows where to go next (the upload action, then the question
input, then the answer).

This is explicitly NOT playful, NOT gamified, and NOT RPG/fantasy themed.
No mascots, no illustrated characters, no emoji in UI chrome, no bouncy
animation, no "leveling up" or game-like framing anywhere, even in empty
states or success messages. The product is used for real documents in real
workflows; it should read as boring-in-a-good-way, dense enough to feel
serious but with generous enough whitespace to never feel cluttered.

The interface is intentionally a single page with two stacked panels
(Documents, then Ask), not a multi-page app. There is no navigation sidebar,
no multi-tenant/workspace switcher, and no account/auth chrome in this
version. Design for exactly this scope; do not propose additional pages,
navigation, or a dashboard shell around it.

## Colors

The palette is a near-monochrome slate scale with a single indigo accent
reserved for primary actions, plus three semantic status colors used only
for document/answer state, never decoratively.

- **Primary (#4F46E5, indigo-600):** The only brand color. Used exclusively
  for primary buttons (Upload, Ask) and small emphasis marks like the
  "Sourced" eyebrow label. Never used for large background fills.
- **Secondary / Neutral text (#0F172A → #64748B, the slate scale):** Slate-900
  for headings, slate-800 for primary body/answer text, slate-600 for
  secondary labels, slate-400/500 for placeholder and muted meta text
  (timestamps, chunk counts). This scale carries almost the entire UI.
- **Surface (#FFFFFF on a very light slate page background):** Cards are pure
  white with a 1px slate-200 border, sitting on a near-white page background.
  No colored page backgrounds.
- **Success (#047857 / emerald-50 background, emerald-700 text):** "Ready"
  document status only.
- **Warning / Advisory (#B45309 / amber-50 background, amber-700/800 text):**
  "Processing" document status, and the guardrail refusal message ("I could
  not find this in the provided documents"). Refusal is an expected, normal
  outcome, not an error, so it must never use red.
- **Error (#B91C1C / red-50 background, red-700 text):** "Failed" document
  status, upload errors, and genuine request failures only.

```yaml
colors:
  primary: "#4F46E5"
  primary-hover: "#6366F1"
  neutral-900: "#0F172A"
  neutral-800: "#1E293B"
  neutral-600: "#475569"
  neutral-500: "#64748B"
  neutral-400: "#94A3B8"
  neutral-200: "#E2E8F0"
  neutral-100: "#F1F5F9"
  neutral-50: "#F8FAFC"
  surface: "#FFFFFF"
  success: "#047857"
  success-surface: "#ECFDF5"
  success-border: "#A7F3D0"
  warning: "#B45309"
  warning-surface: "#FFFBEB"
  warning-border: "#FDE68A"
  error: "#B91C1C"
  error-surface: "#FEF2F2"
  error-border: "#FECACA"
```

## Typography

One typeface family for everything: Geist for all UI text (headings, body,
labels), with Geist Mono reserved only for genuinely technical/numeric
values (similarity scores, chunk counts) if you want that distinction;
plain Geist for those is also fine if it's simpler. Sizes stay small and
restrained throughout, this is a tool read at arm's length on a laptop, not
a marketing page: the largest heading on the page is 24px.

```yaml
typography:
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  eyebrow:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.05em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
```

## Layout

A single centered column, max width ~768px (3xl), on a near-white page
background, generous vertical rhythm between the header and the two panels
(40px+). Each panel (Documents, Ask) is its own white card: 1px slate-200
border, subtle shadow (not heavy), ~8px corner radius, internal padding
24px. Inside a panel, rows (document list items, citation chips) use an 8px
spacing scale, with a 1px slate-100 divider between list rows rather than
extra card nesting. Responsive down to ~375px: the column goes full-width
with 16-24px side padding, citation chips wrap to multiple lines, the
upload control stays usable with touch (large enough tap target).

```yaml
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  content-max-width: 768px
```

## Elevation & Depth

Depth is conveyed with borders and a single soft shadow level, not layered
shadows or heavy blur. Page background is near-white (#F8FAFC or plain
white), panels are pure white cards lifted off it with a 1px slate-200
border and a soft, low-opacity shadow (`shadow-sm` equivalent). Nothing
above that elevation level; there are no modals or floating overlays in
this version.

## Shapes

Minimal, consistent rounding: 8px (`md`) on cards and inputs, 6px (`sm`) on
buttons, fully rounded (`full`) only on status badges and citation chips.
Do not mix sharp and heavily rounded corners on the same screen.

```yaml
rounded:
  sm: 6px
  md: 8px
  full: 9999px
```

## Components

Borders (always 1px, color noted per component below) aren't a recognized
component sub-token in this spec's schema, so they're called out in prose
here instead of as tokens:

- `button-primary`: no border.
- `input-field`: 1px `neutral-200` border, 1px `primary-hover` border on
  focus.
- `card`: 1px `neutral-200` border.
- `badge-ready` / `badge-processing` / `badge-failed`: 1px border in
  `success-border` / `warning-border` / `error-border` respectively.
- `citation-chip`: 1px `neutral-200` border.
- `button-primary-disabled`: same colors as `button-primary` at 50% opacity.

```yaml
components:
  heading:
    textColor: "{colors.neutral-900}"
    typography: "{typography.headline-md}"
  body-text:
    textColor: "{colors.neutral-800}"
    typography: "{typography.body-md}"
  muted-text:
    textColor: "{colors.neutral-500}"
    typography: "{typography.caption}"
  placeholder-text:
    textColor: "{colors.neutral-400}"
    typography: "{typography.body-md}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    typography: "{typography.body-md}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.neutral-800}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "24px"
  badge-ready:
    backgroundColor: "{colors.success-surface}"
    textColor: "{colors.success}"
    rounded: "{rounded.full}"
  badge-processing:
    backgroundColor: "{colors.warning-surface}"
    textColor: "{colors.warning}"
    rounded: "{rounded.full}"
  badge-failed:
    backgroundColor: "{colors.error-surface}"
    textColor: "{colors.error}"
    rounded: "{rounded.full}"
  citation-chip:
    backgroundColor: "{colors.neutral-50}"
    textColor: "{colors.neutral-600}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
    typography: "{typography.caption}"
  citation-chip-hover:
    backgroundColor: "{colors.neutral-100}"
```

Components to design, specifically:

- **Dropzone / file upload:** A proper drag-and-drop target (dashed
  neutral-200 border, centered icon + "Drop a PDF or TXT file here, or
  click to browse"), not a bare native file input. Shows the selected
  filename before submit, disables and shows a loading state while
  uploading.
- **Document list row:** filename (neutral-800, medium weight), a status
  badge (`badge-ready` / `badge-processing` / `badge-failed`), a muted
  chunk count ("42 chunks", neutral-400), and a quiet "Remove" text action
  that only turns error-red on hover, never red by default. A failed row
  additionally shows one line of red caption text with the error reason
  beneath the filename.
- **Question input:** multi-line textarea + primary button, Enter submits
  and Shift+Enter inserts a newline, disabled with a loading label while a
  question is in flight.
- **Streaming answer:** body-md text that grows as it streams; a subtle
  blinking caret or soft fade-in per chunk is welcome, nothing more
  elaborate. Citation chips render in a wrapped row directly beneath the
  answer text using `citation-chip`.
- **Refusal state:** uses `badge-processing`'s warning palette (amber), not
  error red, since a refusal is a correct, expected outcome, not a failure.
  Pair the message with a small muted caption noting the similarity score
  and that it's logged for review.
- **Error state:** uses the error palette, short and plain language, never
  raw technical/stack-trace text.
- **"Setup required" full-page state:** when required configuration is
  missing, replace the entire page with a single centered card: a heading
  ("Setup required"), one explanatory sentence, and optionally a short
  list of missing items, styled like a calm onboarding screen, not an
  error/crash page.

## Do's and Don'ts

- Do use the primary indigo only for the Upload and Ask buttons and the
  small "Sourced" eyebrow label, nowhere else.
- Do use amber for the refusal state; never red, a correct "I don't know"
  is not an error.
- Do keep everything on one page, two stacked panels, no added navigation.
- Don't add mascots, illustrations of characters, emoji in UI chrome, or
  any RPG/game-like language (no "quests," "levels," "achievements," etc.).
- Don't use more than one accent color or introduce gradients as page
  decoration.
- Don't use heavy drop shadows, glassmorphism, or neon/glow effects.
- Do maintain WCAG AA contrast (4.5:1 for normal text) on every color
  pairing above, including status badges and citation chips.
- Don't mix sharp and heavily rounded corners in the same view.
