# MedEra Frontend Design System

This document serves as the source of truth for the visual style, typography, spacing, and micro-interaction patterns used in the MedEra frontend application. It was generated via an audit of the existing codebase.

## 1. Aesthetic Identity
- **Vibe:** Cinematic, modern clinical SaaS, blending glassmorphism with high-end editorial typography.
- **Default Theme:** Dark Mode.
- **Visual Features:**
  - **Glass Islands:** Panels use `backdrop-blur`, subtle borders, and alpha-transparent backgrounds.
  - **Glowing Orbs:** Background decorations utilizing blur and low opacity primary colors.
  - **Noise Overlay:** A global SVG fractal noise overlay is applied to the background to break up digital flatness.

## 2. Color Palette

### Base Theme (Dark)
| Role | Variable | Hex / RGBA |
|------|----------|------------|
| **Canvas** | `--bg-canvas` | `#06060F` |
| **Surface** | `--bg-surface` | `#0D0D1E` |
| **Elevated** | `--bg-elevated` | `#12122A` |
| **Primary/Indigo** | `--indigo` | `#4B4ACF` |
| **Indigo Glow** | `--indigo-glow` | `#6C6BFF` |
| **Lavender** | `--lavender` | `#A5A4F3` |

### Text Colors (Dark)
| Role | Variable | Hex |
|------|----------|-----|
| **Primary** | `--text-primary` | `#F0F0FF` |
| **Secondary** | `--text-secondary` | `#9090B0` |
| **Muted** | `--text-muted` | `#5A5A7A` |

### States & Semantic Colors
- **Success:** `#22C55E` (Background: `rgba(34,197,94,0.10)`)
- **Warning:** `#F59E0B` (Background: `rgba(245,158,11,0.10)`)
- **Error:** `#EF4444` (Background: `rgba(239,68,68,0.10)`)
- **Video Consultation:** `#06B6D4`
- **In-Person Consultation:** `#22C55E`

## 3. Typography
- **Display / Drama:** `Cormorant Garamond` (Italicized frequently for contrast).
- **UI & Body:** `DM Sans` (Primary sans-serif used across cards, inputs, and buttons).
- **Data & Monospace:** `JetBrains Mono` (Used for badges, statuses, tags, dates, and small identifiers).

### Common Text Scales (Arbitrary values found)
- **Headers:** `text-[36px]`, `text-[28px]`, `text-[24px]`
- **Body / Subheadings:** `text-[16px]`, `text-[15px]`, `text-[14px]`
- **Small Text:** `text-[13px]`, `text-[12px]`
- **Micro / Data Labels:** `text-[11px]`, `text-[10px]` tracking-wider/widest

## 4. Radiuses & Shadows
- **Radiuses:** Extensive use of `rounded-[20px]`, `rounded-[24px]`, `rounded-xl` for cards, and `rounded-[12px]` / `rounded-[14px]` for inputs and buttons.
- **Card Shadow:** `0 24px 64px rgba(0,0,0,0.5)`
- **Hover Shadow:** `0 20px 60px rgba(75,74,207,0.15)`
- **Input Glow:** `0 0 0 3px rgba(75,74,207,0.15)`

## 5. Interaction Patterns
- **Buttons (`.magnetic-btn`):** Subtly scale up (`scale(1.03)`) on hover using a specific easing function `cubic-bezier(0.25, 0.46, 0.45, 0.94)`.
- **Card Hover:** Cards lift (`translateY(-6px)`) and increase drop-shadow spread and border intensity on hover.
- **Micro-animations:** 
  - Framer Motion staggered fade-ups (`delay: i * 0.08`).
  - ScrollTrigger GSAP animations on page mounts.
  - Number counting animations for stats (`CountUp`).

## 6. CSS Utilities
- `.glass-island`: Standard card class adding background surface, border, and shadows.
- `.text-shadow-glow`: Text shadow effect using the indigo glow color.
- `.hide-scrollbar`: Cross-browser hidden scrollbar while maintaining scroll functionality.

## Strict Rule for Future Development
Do not override these established patterns with generic Tailwind classes (e.g., plain `bg-blue-500` or `rounded-sm`). Always refer to these specific tokens and arbitrary values to maintain the "1:1 Pixel Perfect" cinematic feel.
