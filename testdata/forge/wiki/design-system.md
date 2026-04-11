---
title: Design System
modified: "2026-04-11"
icon: palette
order: 2
---

Forge uses a custom design token system built on Tailwind CSS v4 and shadcn/ui components.

## Color Tokens

The design system supports both light and dark modes with semantic color tokens that automatically adapt based on the user's preference.

### Light Mode

**Background**
- `--color-background`: `hsl(0 0% 100%)` - Primary background
- `--color-background-secondary`: `hsl(0 0% 96%)` - Secondary background
- `--color-background-tertiary`: `hsl(0 0% 92%)` - Tertiary background

**Foreground**
- `--color-foreground`: `hsl(0 0% 9%)` - Primary text
- `--color-foreground-secondary`: `hsl(0 0% 40%)` - Secondary text
- `--color-foreground-muted`: `hsl(0 0% 60%)` - Muted text

**Primary**
- `--color-primary`: `hsl(222 47% 50%)` - Primary brand color
- `--color-primary-hover`: `hsl(222 47% 45%)` - Primary hover state
- `--color-primary-foreground`: `hsl(0 0% 100%)` - Text on primary

**Accent**
- `--color-accent`: `hsl(210 40% 96%)` - Accent background
- `--color-accent-hover`: `hsl(210 40% 92%)` - Accent hover
- `--color-accent-foreground`: `hsl(222 47% 11%)` - Text on accent

**Border**
- `--color-border`: `hsl(0 0% 88%)` - Default border
- `--color-border-hover`: `hsl(0 0% 75%)` - Border hover state

**Semantic Colors**
- `--color-success`: `hsl(142 76% 36%)` - Success states
- `--color-success-foreground`: `hsl(0 0% 100%)` - Text on success
- `--color-warning`: `hsl(38 92% 50%)` - Warning states
- `--color-warning-foreground`: `hsl(0 0% 9%)` - Text on warning
- `--color-error`: `hsl(0 84% 60%)` - Error states
- `--color-error-foreground`: `hsl(0 0% 100%)` - Text on error
- `--color-info`: `hsl(199 89% 48%)` - Info states
- `--color-info-foreground`: `hsl(0 0% 100%)` - Text on info

### Dark Mode

**Background**
- `--color-background`: `hsl(0 0% 9%)` - Primary background
- `--color-background-secondary`: `hsl(0 0% 12%)` - Secondary background
- `--color-background-tertiary`: `hsl(0 0% 15%)` - Tertiary background

**Foreground**
- `--color-foreground`: `hsl(0 0% 98%)` - Primary text
- `--color-foreground-secondary`: `hsl(0 0% 70%)` - Secondary text
- `--color-foreground-muted`: `hsl(0 0% 50%)` - Muted text

**Primary**
- `--color-primary`: `hsl(222 47% 55%)` - Primary brand color
- `--color-primary-hover`: `hsl(222 47% 60%)` - Primary hover state
- `--color-primary-foreground`: `hsl(0 0% 100%)` - Text on primary

**Accent**
- `--color-accent`: `hsl(210 40% 15%)` - Accent background
- `--color-accent-hover`: `hsl(210 40% 18%)` - Accent hover
- `--color-accent-foreground`: `hsl(210 40% 98%)` - Text on accent

**Border**
- `--color-border`: `hsl(0 0% 25%)` - Default border
- `--color-border-hover`: `hsl(0 0% 35%)` - Border hover state

**Semantic Colors**
- `--color-success`: `hsl(142 76% 45%)` - Success states
- `--color-success-foreground`: `hsl(0 0% 9%)` - Text on success
- `--color-warning`: `hsl(38 92% 55%)` - Warning states
- `--color-warning-foreground`: `hsl(0 0% 9%)` - Text on warning
- `--color-error`: `hsl(0 84% 65%)` - Error states
- `--color-error-foreground`: `hsl(0 0% 100%)` - Text on error
- `--color-info`: `hsl(199 89% 55%)` - Info states
- `--color-info-foreground`: `hsl(0 0% 9%)` - Text on info

## Typography

### Font Families
- `--font-sans`: System font stack optimized for UI
- `--font-mono`: Monospace stack for code blocks

### Font Sizes
- `--text-xs`: `0.75rem` (12px)
- `--text-sm`: `0.875rem` (14px)
- `--text-base`: `1rem` (16px)
- `--text-lg`: `1.125rem` (18px)
- `--text-xl`: `1.25rem` (20px)
- `--text-2xl`: `1.5rem` (24px)
- `--text-3xl`: `1.875rem` (30px)
- `--text-4xl`: `2.25rem` (36px)

### Font Weights
- `--font-normal`: `400`
- `--font-medium`: `500`
- `--font-semibold`: `600`
- `--font-bold`: `700`

## Spacing

The spacing scale follows a consistent 4px base unit:

- `--space-1`: `0.25rem` (4px)
- `--space-2`: `0.5rem` (8px)
- `--space-3`: `0.75rem` (12px)
- `--space-4`: `1rem` (16px)
- `--space-6`: `1.5rem` (24px)
- `--space-8`: `2rem` (32px)
- `--space-12`: `3rem` (48px)
- `--space-16`: `4rem` (64px)
- `--space-24`: `6rem` (96px)

## Border Radius

- `--radius-sm`: `0.25rem` (4px)
- `--radius-md`: `0.375rem` (6px)
- `--radius-lg`: `0.5rem` (8px)
- `--radius-xl`: `0.75rem` (12px)
- `--radius-full`: `9999px`

## Shadows

### Light Mode
- `--shadow-sm`: `0 1px 2px 0 rgb(0 0 0 / 0.05)`
- `--shadow-md`: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`
- `--shadow-lg`: `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`

### Dark Mode
- `--shadow-sm`: `0 1px 2px 0 rgb(0 0 0 / 0.3)`
- `--shadow-md`: `0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4)`
- `--shadow-lg`: `0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.5)`

## Component Guidelines

### Buttons

Buttons should use semantic color tokens and support all interactive states:

- **Primary**: Use `--color-primary` with `--color-primary-foreground`
- **Secondary**: Use `--color-accent` with `--color-accent-foreground`
- **Destructive**: Use `--color-error` with `--color-error-foreground`
- **Ghost**: Transparent background with `--color-foreground` text

### Cards

Cards provide visual grouping and hierarchy:

- Background: `--color-background-secondary`
- Border: `--color-border`
- Radius: `--radius-lg`
- Shadow: `--shadow-sm`

### Inputs

Form inputs maintain consistent styling:

- Background: `--color-background`
- Border: `--color-border`
- Focus ring: `--color-primary`
- Placeholder: `--color-foreground-muted`

## Accessibility

All color combinations meet WCAG 2.1 AA standards for contrast ratios:

- Normal text: Minimum 4.5:1
- Large text (18px+): Minimum 3:1
- UI components: Minimum 3:1

Interactive elements include visible focus states and support keyboard navigation.


