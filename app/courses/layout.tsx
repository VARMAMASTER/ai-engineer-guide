/**
 * KaTeX's stylesheet, scoped to the one section that has equations.
 *
 * The maths itself is already typeset — `katex.renderToString` runs during
 * `next build`, so these pages ship finished markup and the 280KB library is
 * never sent to a browser. What that markup still needs is this stylesheet and
 * the fonts it references, which is the entire client-side cost of 56 display
 * equations: no JavaScript, and no layout work on the main thread.
 *
 * Imported here rather than in the root layout so the rest of the app, none of
 * which contains an equation, does not carry it.
 */
import 'katex/dist/katex.min.css'

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return children
}
