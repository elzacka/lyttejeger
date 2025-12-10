/**
 * Design Tokens - TypeScript exports
 * These mirror the CSS custom properties for type-safe usage in components
 */

// Color tokens
export const colors = {
  bg: {
    primary: 'var(--color-bg-primary)',
    secondary: 'var(--color-bg-secondary)',
    hover: 'var(--color-bg-hover)',
  },
  text: {
    primary: 'var(--color-text-primary)',
    secondary: 'var(--color-text-secondary)',
    muted: 'var(--color-text-muted)',
    inverse: 'var(--color-text-inverse)',
  },
  accent: {
    default: 'var(--color-accent)',
    hover: 'var(--color-accent-hover)',
    alpha: 'var(--color-accent-alpha)',
    subtle: 'var(--color-accent-subtle)',
  },
  border: {
    default: 'var(--color-border)',
    light: 'var(--color-border-light)',
  },
  semantic: {
    error: 'var(--color-error)',
    warning: 'var(--color-warning)',
    success: 'var(--color-success)',
  },
} as const

// Spacing tokens
export const spacing = {
  0: 'var(--space-0)',
  1: 'var(--space-1)',
  2: 'var(--space-2)',
  3: 'var(--space-3)',
  4: 'var(--space-4)',
  5: 'var(--space-5)',
  6: 'var(--space-6)',
  7: 'var(--space-7)',
  8: 'var(--space-8)',
  '2xs': 'var(--space-2xs)',
  xs: 'var(--space-xs)',
  sm: 'var(--space-sm)',
  md: 'var(--space-md)',
  lg: 'var(--space-lg)',
  xl: 'var(--space-xl)',
  '2xl': 'var(--space-2xl)',
} as const

// Touch target tokens
export const touchTargets = {
  min: 'var(--touch-target-min)',
  comfortable: 'var(--touch-target-comfortable)',
  large: 'var(--touch-target-large)',
} as const

// Typography tokens
export const typography = {
  fontFamily: {
    mono: 'var(--font-mono)',
    sans: 'var(--font-sans)',
    icon: 'var(--font-icon)',
  },
  fontSize: {
    '2xs': 'var(--font-size-2xs)',
    xs: 'var(--font-size-xs)',
    sm: 'var(--font-size-sm)',
    base: 'var(--font-size-base)',
    md: 'var(--font-size-md)',
    lg: 'var(--font-size-lg)',
    xl: 'var(--font-size-xl)',
    '2xl': 'var(--font-size-2xl)',
  },
  fontWeight: {
    normal: 'var(--font-weight-normal)',
    medium: 'var(--font-weight-medium)',
    semibold: 'var(--font-weight-semibold)',
    bold: 'var(--font-weight-bold)',
  },
  lineHeight: {
    tight: 'var(--line-height-tight)',
    normal: 'var(--line-height-normal)',
    relaxed: 'var(--line-height-relaxed)',
  },
} as const

// Sizing tokens
export const sizing = {
  maxWidth: 'var(--max-width)',
  playerHeight: 'var(--player-height)',
  playerHeightMobile: 'var(--player-height-mobile)',
  navHeight: 'var(--nav-height)',
  button: {
    sm: 'var(--button-sm)',
    md: 'var(--button-md)',
    lg: 'var(--button-lg)',
  },
  image: {
    xs: 'var(--image-xs)',
    sm: 'var(--image-sm)',
    md: 'var(--image-md)',
    lg: 'var(--image-lg)',
  },
  icon: {
    sm: 'var(--icon-sm)',
    md: 'var(--icon-md)',
    lg: 'var(--icon-lg)',
  },
  badge: 'var(--badge-size)',
} as const

// Border tokens
export const borders = {
  radius: {
    none: 'var(--radius-none)',
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    full: 'var(--radius-full)',
  },
  width: {
    thin: 'var(--border-width-thin)',
    medium: 'var(--border-width-medium)',
  },
  shadow: {
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    xl: 'var(--shadow-xl)',
    sheet: 'var(--shadow-sheet)',
  },
} as const

// Animation tokens
export const animations = {
  duration: {
    instant: 'var(--duration-instant)',
    fast: 'var(--duration-fast)',
    normal: 'var(--duration-normal)',
    slow: 'var(--duration-slow)',
    slower: 'var(--duration-slower)',
  },
  ease: {
    default: 'var(--ease-default)',
    in: 'var(--ease-in)',
    out: 'var(--ease-out)',
    inOut: 'var(--ease-in-out)',
    bounce: 'var(--ease-bounce)',
  },
  transition: {
    fast: 'var(--transition-fast)',
    base: 'var(--transition-base)',
    slow: 'var(--transition-slow)',
  },
} as const

// Z-index tokens
export const zIndex = {
  base: 'var(--z-base)',
  dropdown: 'var(--z-dropdown)',
  sticky: 'var(--z-sticky)',
  nav: 'var(--z-nav)',
  player: 'var(--z-player)',
  modalBackdrop: 'var(--z-modal-backdrop)',
  modal: 'var(--z-modal)',
  toast: 'var(--z-toast)',
} as const

// Type exports for type-safe component props
export type ColorToken = typeof colors
export type SpacingToken = keyof typeof spacing
export type FontSizeToken = keyof typeof typography.fontSize
export type RadiusToken = keyof typeof borders.radius
export type ShadowToken = keyof typeof borders.shadow
export type ZIndexToken = keyof typeof zIndex

// Breakpoints (numeric for JS usage)
export const breakpoints = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
} as const

export type Breakpoint = keyof typeof breakpoints
