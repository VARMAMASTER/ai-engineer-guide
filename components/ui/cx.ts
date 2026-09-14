/**
 * Join class names, dropping anything falsy.
 *
 * Every primitive takes a `className` and appends it rather than replacing its
 * own, so a consumer can add a layout class without silently losing the
 * component's styling. That needs one line of logic, which is why this is a
 * four-line local helper and not a dependency — `clsx` would be a runtime
 * package for something the language already does.
 *
 * It lived in sixteen copies before this: the three agents that built the
 * primitives were each told not to create a shared file, so each wrote its own,
 * and two of the sixteen had already drifted apart in signature. That is the
 * whole argument for a single definition.
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export default cx
