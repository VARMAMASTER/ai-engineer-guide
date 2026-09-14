import * as React from 'react'
import Link from 'next/link'
import { cx } from './cx'

/** Shallow-omit: strips keys before spreading the rest onto a DOM element. */
function omit<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> {
  const copy: T = { ...obj }
  for (const key of keys) delete copy[key]
  return copy
}

type CardCommonProps = {
  className?: string
  children?: React.ReactNode
}

type CardLinkProps = CardCommonProps &
  Omit<React.ComponentPropsWithoutRef<typeof Link>, 'href' | 'className' | 'children'> & {
    /** Presence of `href` is what makes a Card a link — no separate `as` needed. */
    href: string
    as?: undefined
  }

type CardButtonProps = CardCommonProps &
  Omit<React.ComponentPropsWithoutRef<'button'>, 'className' | 'children'> & {
    as: 'button'
    href?: undefined
  }

type CardDivProps = CardCommonProps &
  // No `onClick` here on purpose — see the component doc comment.
  Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'children' | 'onClick'> & {
    as?: 'div'
    href?: undefined
  }

export type CardProps = CardLinkProps | CardButtonProps | CardDivProps

/**
 * A Card is a Panel (`.panel .card`) that most of the app uses to navigate.
 * Give it `href` and it renders a real Next.js `<Link>`; give it
 * `as="button"` and it renders a real `<button>` — both land in the tab
 * order and respond to Enter/Space on their own, which a `<div onClick>`
 * never does. That is also why the plain `<div>` variant's type has no
 * `onClick` at all: an "interactive div" is not representable through this
 * component — reach for `as="button"` (or `href`) instead.
 *
 * Blur budget: Card composes `.panel`, one of the two blurred tiers. Never
 * nest a `Panel`/`Card` (or `.raised`) inside one — nest a `Panel
 * tier="solid"` (`.surface-solid`) block instead.
 */
const Card = React.forwardRef<HTMLAnchorElement | HTMLButtonElement | HTMLDivElement, CardProps>(
  function Card(props, ref) {
    const classes = cx('panel card', props.className)

    if (typeof props.href === 'string') {
      const linkProps = omit(props as CardLinkProps, ['href', 'className', 'children', 'as'])
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={props.href}
          className={classes}
          {...linkProps}
        >
          {props.children}
        </Link>
      )
    }

    if (props.as === 'button') {
      const buttonProps = omit(props as CardButtonProps, ['as', 'className', 'children', 'href'])
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type={buttonProps.type ?? 'button'}
          className={classes}
          {...buttonProps}
        >
          {props.children}
        </button>
      )
    }

    const divProps = omit(props as CardDivProps, ['as', 'className', 'children', 'href'])
    return (
      <div ref={ref as React.Ref<HTMLDivElement>} className={classes} {...divProps}>
        {props.children}
      </div>
    )
  },
)
Card.displayName = 'Card'

export default Card
