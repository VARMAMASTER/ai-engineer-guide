import * as React from 'react'

/** Merge classNames without a `clsx` dependency: falsy values drop out. */
function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export type PanelTier = 'panel' | 'raised' | 'solid'

export interface PanelProps extends React.ComponentPropsWithoutRef<'div'> {
  /**
   * Which of the three surface tiers this block is.
   *
   * - `panel` (default) — the translucent, blurred tier: cards, rows, the nav
   *   rail.
   * - `raised` — the More-sheet / popover tier: more blur, a stronger border,
   *   a drop shadow.
   * - `solid` — `.surface-solid`, opaque and never blurred. This is what a
   *   block *nested inside* a `panel` or `raised` Panel must use.
   *
   * Blur budget: at most TWO blurred layers may be stacked on screen at
   * once. A `panel` or `raised` Panel must NEVER contain another `panel` or
   * `raised` Panel (or a `Card`, which is a Panel too) — nest a `solid`
   * Panel instead. This prop makes the safe choice a one-word change instead
   * of a class string to get right.
   */
  tier?: PanelTier
  /**
   * Flush variant: keeps the fill and hairline but drops the drop shadow —
   * for chrome (top bar, tab bar, nav rail) that sits flush against an edge,
   * where a floating shadow would only smear down the page. Only meaningful
   * on the `panel` tier.
   */
  flush?: boolean
}

const TIER_CLASS: Record<PanelTier, string> = {
  panel: 'panel',
  raised: 'raised',
  solid: 'surface-solid',
}

/**
 * A non-interactive surface block wrapping the app's three CSS tiers
 * (`.panel` / `.raised` / `.surface-solid`). For a surface that navigates or
 * is pressable, use `Card` instead — it renders a real `<a>` or `<button>`.
 */
const Panel = React.forwardRef<HTMLDivElement, PanelProps>(function Panel(
  { tier = 'panel', flush = false, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx(TIER_CLASS[tier], tier === 'panel' && flush && 'panel-flush', className)}
      {...props}
    />
  )
})
Panel.displayName = 'Panel'

export default Panel
