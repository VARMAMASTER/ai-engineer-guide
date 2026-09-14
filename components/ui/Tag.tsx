import * as React from 'react'
import { cx } from './cx'

export type TagVariant = 'default' | 'outline' | 'accent'

export interface TagProps extends React.ComponentPropsWithoutRef<'span'> {
  variant?: TagVariant
}

const VARIANT_CLASS: Record<TagVariant, string> = {
  default: '',
  outline: 'tag-outline',
  accent: 'tag-accent',
}

/**
 * A static label — difficulty, company, tier, kind. 22px tall, never a tap
 * target and never gains a hover state. Renders as a plain `<span>` on
 * purpose: a pressable filter or mode switch is `Chip`, not this. Do not
 * attach `onClick`/`role="button"` here — that is exactly the line the
 * design system draws between `.tag` and `.chip`.
 */
const Tag = React.forwardRef<HTMLSpanElement, TagProps>(function Tag(
  { variant = 'default', className, ...props },
  ref,
) {
  return <span ref={ref} className={cx('tag', VARIANT_CLASS[variant], className)} {...props} />
})
Tag.displayName = 'Tag'

export default Tag
