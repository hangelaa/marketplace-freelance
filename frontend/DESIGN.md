---
version: alpha
name: Peyvand
description: A Persian-first freelance identity with editorial clarity and a quiet indigo collaboration canvas.
colors:
  primary: "#4338CA"
  primary-hover: "#3730A3"
  violet: "#A78BFA"
  mint: "#2DD4BF"
  background: "#F8FAFC"
  surface: "#FFFFFF"
  ink: "#0F172A"
  muted: "#64748B"
  border: "#E2E8F0"
  story: "#24215B"
  story-text: "#F8F7FF"
  destructive: "#B91C1C"
typography:
  h1:
    fontFamily: Vazirmatn
    fontSize: 34px
    fontWeight: 800
    lineHeight: 1.6
    letterSpacing: 0px
  h2:
    fontFamily: Vazirmatn
    fontSize: 49px
    fontWeight: 800
    lineHeight: 1.65
    letterSpacing: 0px
  body-md:
    fontFamily: Vazirmatn
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.8
    letterSpacing: 0px
rounded:
  sm: 8px
  md: 10px
  lg: 15px
  xl: 22px
spacing:
  xs: 8px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    height: 52px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.surface}"
  form-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  story-panel:
    backgroundColor: "{colors.story}"
    textColor: "{colors.story-text}"
    rounded: "{rounded.xl}"
---

## Overview

**پیوند / PEYVAND** connects the idea of independent talent with meaningful collaboration. The original inline SVG mark uses two interlocking strokes. The auth screen is editorial, not a marketplace dashboard: one clear form, one supporting story, no platform statistics or implied endorsements.

Authoritative implementation: `app/globals.css`, `components/branding/brand.tsx`, `components/branding/story-panel.tsx`, and `components/layout/auth-shell.tsx`.

## Colors

Indigo `#4338CA` identifies primary actions; hover deepens to `#3730A3`. Ink `#0F172A` carries readable content on white or `#F8FAFC`. Muted copy uses `#64748B`; borders use `#E2E8F0`. Violet `#A78BFA` and mint `#2DD4BF` are restrained illustrative accents, not small text on white. Story background `#24215B` deliberately differs from the actionable primary.

CSS exposes shadcn-compatible `--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--muted`, `--accent`, `--border`, `--input`, `--ring`, `--destructive` and foreground counterparts through Tailwind v4 `@theme inline`.

## Typography

Vazirmatn is supplied by the root layout as `--font-vazirmatn`; Tahoma and Arial are fallbacks. Persian text never uses tracking. Only explicitly Latin micro-labels have letter spacing. Body line-height is 1.8, longer Persian descriptions 2–2.1. Heading weights are 800 with open line-height, not compressed Latin-style display typography.

## Layout

The shell has two near-equal columns (1.08:1), RTL reading order: a focused white login card on a quiet slate canvas **right**, inset deep-indigo story **left**. The card max-width is 440px with 36px padding, a subtle border, 22px corners and restrained elevation. A small lock tile introduces a direct task heading, short instructions, persistent field labels and one prominent primary action. The story has a 16px outer inset, 22px corners, original CSS/SVG composition, and no stock media. The illustration labels its project as a sample and its caption states that the information is illustrative.

At widths below 1024px the story is hidden; the form is first with a 440px card cap. At 480px and below, page horizontal padding becomes 20px and card padding becomes 28px 22px. Inputs use 16px text to avoid mobile focus zoom; placeholders remain visually secondary. Auth shell uses `100svh`, flex growth and content-based scrolling rather than a fixed viewport height. Avoid adding a second navigation or promotional section on mobile. Session messages have their own heading-to-feedback spacing; registration remains separated from the primary task by a quiet divider. Supporting copy gives practical account guidance rather than unverified security guarantees.

## Elevation & Depth

White inputs use only a minimal contact shadow. The primary action has a restrained indigo shadow. The login card gains a softly indigo-tinted border and deeper shadow on fine-pointer hover and keyboard focus within, with a 220ms transition and no movement or pointer cursor on the card itself. Touch devices do not receive sticky hover styling; reduced-motion preferences disable the transition through the shared rule. Auth secondary actions and the password toggle have at least 44px-high touch targets. Focused field icons use primary color, while invalid field icons retain destructive color. The illustrative project has stronger elevation against the dark story canvas; satellite talent tiles use low-contrast solid surfaces. No gradients, blur blobs, glassmorphism, or large glow effects.

## Shapes

Inputs/actions: 10px radius and 52px height. Large containers: 22px. The mark uses a 13px inset tile. Small pills are reserved for illustrative skill categories. Orbit lines and connectors are decorative and hidden from assistive technology.

## Components

- `Brand({ light?: boolean })`: named export, home link, Persian accessible name, original vector mark and bilingual wordmark.
- `StoryPanel()`: named export; labelled aside, editorial heading and semantic figure with explicit illustrative caption. No interactive-looking fake controls.
- `AuthShell({ children: ReactNode })`: named export; brand header, real main landmark, restrained footer and desktop story pane. Does not implement auth logic.
- Auth form classes: `auth-content`, `eyebrow`, `form-heading`, `form-description`, `login-form`, `field-group`, `field-label-row`, `field-label`, `input-wrap`, `field-icon`, `password-toggle`, `field-error`, `form-feedback`, `submit-button`, `form-options`, `text-link`, `signup-prompt`, `security-note`, `coming-soon`.
- `field-icon` belongs directly in `input-wrap`; icons are positioned at logical inline-start, toggle at inline-end. Input padding reserves both. Email can use `dir="ltr"` without changing wrapper direction. Parent supplies actual labels, `aria-invalid`, error descriptions and `role="alert"` for `form-feedback`; CSS cannot add ARIA.
- Minimal welcome classes: `welcome-shell`, `welcome-header`, `welcome-card`, `welcome-icon`, `welcome-eyebrow`, `welcome-title`, `welcome-description`, `identity-row`, `identity-avatar`, `identity-info`, `identity-label`, `welcome-footer`, `welcome-note`. These support only actual identity and sign-out, not speculative marketplace functionality.

## Do's and Don'ts

- Keep keyboard focus visible. Fields show border plus ring; invalid fields use destructive color. Password toggle touch target is 40px.
- Keep validation textual, connected to fields; color alone is not a status cue.
- Honor `prefers-reduced-motion`; the brief entrance effect and transitions are reduced by the shared rule.
- Do not add invented user counts, revenue, star ratings, reviews, partner logos, or payment/security guarantees.
- Do not interpret the collaboration composition as a live marketplace feature or selectable project.
- Preserve RTL logical positioning. Form DOM comes before story DOM; do not reverse with visual-only ordering.
- Build, verify actual form semantics and inspect desktop/mobile rendering after integrating with the parent-owned auth module. This document is not evidence of an executed browser check.
