# Paganini Dashboard — Design System

## Visual language

Dark-first UI built for financial operations monitoring. The palette leans on deep navy/charcoal backgrounds with muted gray text and sharp accent colors for status indicators. The aesthetic is dense, data-rich, and unapologetically dark.

## Color palette

### Backgrounds
| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#0f0f17` | Page background |
| `bg-card` | Tailwind `bg-[#0f0f17]/50` | Card surfaces (translucent) |
| `bg-card-border` | `border-gray-800` | Card borders |

### Accent — Purple (brand)
| Token | Value | Usage |
|-------|-------|-------|
| `accent-primary` | `#7c3aed` (violet-600) | Primary buttons, active states |
| `accent-dark` | `#5b21b6` (violet-800) | Gradient stops, hover states |
| `accent-light` | `#a78bfa` (violet-400) | Links, highlights |

### Status indicators
| Token | Value | Usage |
|-------|-------|-------|
| `status-healthy` | `bg-green-500` / `text-green-400` | Online, passing, healthy |
| `status-warning` | `text-yellow-400` / `#eab30844` | Medium confidence, caution |
| `status-error` | `bg-red-500` / `text-red-400` / `#ef444444` | Offline, failing, critical |
| `status-neutral` | `bg-gray-500` / `text-gray-400` | Inactive, unknown |

### Text hierarchy
| Token | Class | Usage |
|-------|-------|-------|
| `text-primary` | `text-gray-100` | Headlines, primary content |
| `text-secondary` | `text-gray-200` | Subheadlines |
| `text-tertiary` | `text-gray-300` | Body text |
| `text-muted` | `text-gray-400` | Labels, captions |
| `text-dimmed` | `text-gray-500` | Disabled, timestamps |
| `text-subtle` | `text-gray-600` / `text-gray-700` | Decorative, dividers |

## Typography

- **Font stack:** System (Tailwind default — Inter, system-ui, sans-serif)
- **Sizes:** `text-xs` (labels), `text-sm` (body), `text-lg` (section titles), `text-2xl` (card headers), `text-3xl` (page title)
- **Weights:** Normal (body), Semibold (labels/badges), Bold (headers)

## Spacing scale

| Use case | Values |
|----------|--------|
| Inner padding | `p-3`, `p-4`, `p-6` |
| Horizontal padding | `px-1`–`px-6` |
| Vertical padding | `py-0`–`py-8` |
| Gaps | `gap-2`, `gap-3`, `gap-4`, `gap-6` |

## Border radius

| Token | Usage |
|-------|-------|
| `rounded` | Small badges |
| `rounded-lg` | Cards |
| `rounded-xl` | Main containers |
| `rounded-full` | Pulse dots, avatars |

## Component tokens

### Pulse dot (status indicator)
- Size: `w-2 h-2`
- Shape: `rounded-full`
- Animation: CSS `@keyframes pulse` (1.5s infinite)
- Colors: green (online), red (offline), gray (unknown)

### Badge
- Padding: `px-2 py-0.5` or `px-3 py-1`
- Radius: `rounded` or `rounded-full`
- Background: translucent accent (`#22c55e44`, `#eab30844`, `#ef444444`)
- Text: corresponding `text-{color}-400`

### Card
- Background: translucent dark (`bg-[#0f0f17]/50`)
- Border: `border border-gray-800`
- Radius: `rounded-xl`
- Padding: `p-4` or `p-6`
- Shadow: none (flat design)

### Footer
- Text: `text-gray-600`
- Separator: `text-gray-700`
- Badge: version with `text-violet-400` accent

## Dark mode

The dashboard is dark-only. There is no light mode toggle. All colors are designed for dark backgrounds. If a light mode is ever needed, invert the gray scale (100↔900) and adjust accent translucencies.
