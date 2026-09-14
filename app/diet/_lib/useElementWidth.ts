'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The rendered width of an element, in CSS pixels.
 *
 * Charts here are drawn at 1:1 user units rather than scaled through a
 * `viewBox`, and this is why. A `viewBox` of `0 0 720 240` on a 390px phone
 * scales everything by 0.54 — including the 10px axis labels, which arrive as
 * 5.4px and are unreadable. Measuring the container instead means a tick label
 * is 10px at every width, and only the plot stretches.
 *
 * Returns `0` until the first measurement, which is the signal to render a
 * skeleton rather than a chart with a negative scale in it.
 */
export function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    setWidth(element.clientWidth)

    // `ResizeObserver` rather than a window resize listener: the element also
    // changes width when the nav rail appears at 768px and when a sheet opens,
    // neither of which resizes the window.
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0
      setWidth(Math.round(next))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}
