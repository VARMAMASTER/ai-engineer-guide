'use client'

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useModalOverlay } from '@/components/ui/Dialog'
import EmptyState from '@/components/ui/EmptyState'
import Input from '@/components/ui/Input'
import Tag from '@/components/ui/Tag'
import { cx } from '@/components/ui/cx'
import {
  DESTINATIONS,
  KIND_LABEL,
  getSearchIndex,
  search,
  type SearchItem,
} from '@/lib/search/index'

/* ============================================================================
   CommandPalette — jump to anything, from anywhere.
   ----------------------------------------------------------------------------
   MOUNTING CONTRACT
     Render `<CommandPalette />` exactly once, as the last child of the app
     shell (a sibling of the nav, not inside it). It takes no props and renders
     nothing until it is opened, so where it sits in the tree is irrelevant to
     layout — it portals onto `document.body`.

     To open it from a button, call the exported `openCommandPalette()`. To
     give that button a correct `aria-expanded`, read `useCommandPaletteOpen()`.
     Nothing else needs wiring; Ctrl/Cmd+K is bound by the component itself for
     as long as it is mounted.

   WHY AN EXTERNAL STORE RATHER THAN PROPS
     The palette is opened from three places that have no ancestor in common —
     a keystroke on `document`, a button in the top bar, and (later) a button
     in the empty state of a section. Lifting `open` into the shell would make
     every one of those a prop drill through the nav, which is the component
     tree this palette exists to let the user skip. A module-level store read
     through `useSyncExternalStore` is the smaller thing: no context provider,
     no re-render of the shell when the palette opens, and `openCommandPalette`
     is callable from code that is not a React component at all.

   OVERLAY BEHAVIOUR is not reimplemented here. `useModalOverlay` from
   `components/ui/Dialog` owns the focus trap, the `inert` background, the body
   scroll lock, Escape, focus return to the trigger, and the
   `:root[data-sheet="open"]` switch that drops every other blurred surface to
   solid — so the palette is the only blurred layer while it is up.

   THE COMBOBOX RULE that gets broken most often: DOM focus never leaves the
   input. Arrow keys move `aria-activedescendant` to the id of the highlighted
   option; they do not focus it. Moving real focus onto an option is what makes
   a screen reader stop reading what the user typed, and makes the next
   keystroke go somewhere other than the query.
   ========================================================================== */

/* --- the open/closed store ------------------------------------------------ */

let isOpen = false
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const readOpen = () => isOpen
// The palette never exists on the server: it is an overlay opened by a
// keystroke, so its server snapshot is always closed and no markup is emitted.
const readOpenOnServer = () => false

/** Open the palette. Safe to call from anywhere, including outside React. */
export function openCommandPalette(): void {
  if (isOpen) return
  isOpen = true
  emit()
}

/** Close the palette. Escape and the scrim already do this. */
export function closeCommandPalette(): void {
  if (!isOpen) return
  isOpen = false
  emit()
}

/** Whether the palette is open — for a trigger button's `aria-expanded`. */
export function useCommandPaletteOpen(): boolean {
  return useSyncExternalStore(subscribe, readOpen, readOpenOnServer)
}

/** Test seam: drop the open state between tests. Nothing in the app calls it. */
export function resetCommandPalette(): void {
  isOpen = false
  emit()
}

/* --- the keyboard shortcut ------------------------------------------------ */

/**
 * True when `target` is somewhere the user is typing prose.
 *
 * The shortcut steps aside for these. A modifier chord is not typing, so this
 * is stricter than it strictly has to be — but "must not hijack typing inside
 * an input or textarea" is a rule worth over-honouring: the cost of getting it
 * wrong is a user losing a keystroke mid-sentence, and the cost of getting it
 * right is one extra click to leave the field first.
 */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/* --- results -------------------------------------------------------------- */

const RESULT_LIMIT = 25

export default function CommandPalette() {
  const open = useCommandPaletteOpen()
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [items, setItems] = useState<SearchItem[] | null>(null)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)

  const listId = useId()
  const optionPrefix = useId()
  const labelId = useId()
  const hintId = useId()

  const close = useCallback(() => {
    closeCommandPalette()
  }, [])

  const { panelRef, ready } = useModalOverlay(open, close)

  /* --- Ctrl/Cmd+K, bound for as long as this component is mounted -------- */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'k' && event.key !== 'K') return
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return
      if (isEditable(event.target)) return
      event.preventDefault()
      openCommandPalette()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  /* --- build the index, once, on the first open -------------------------- */
  useEffect(() => {
    if (!open) return
    let live = true
    // `getSearchIndex` memoises the promise, so this is one build for the life
    // of the page however many times the palette is opened. The content banks
    // ride in on a dynamic import inside it, so nothing is parsed during SSR
    // or on the first paint of any page — only here, after a deliberate open.
    void getSearchIndex().then((built) => {
      if (live) setItems(built)
    })
    return () => {
      live = false
    }
  }, [open])

  /* --- clear the query on close, so the next open starts fresh ----------- */
  // Adjusted during render rather than in an effect. The query is state derived
  // from "has the palette just closed", and React's rule for that is to compare
  // against the previous value and re-render immediately — an effect would
  // paint one frame of the old query first and costs a cascading render.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (!open) {
      setQuery('')
      setActive(0)
    }
  }

  /* --- focus the field, after the overlay has captured the trigger ------- */
  useEffect(() => {
    if (!ready) return
    // `useModalOverlay` focuses the panel and records what was focused before
    // it did. Its effects are registered before this one, so by the time this
    // runs the trigger is already saved and focus can move on to the field.
    inputRef.current?.focus()
  }, [ready])

  const results = useMemo(() => {
    // An empty query is not a failed search: it is the "where can I go" state,
    // and the answer to that is the destination list, not nothing.
    if (query.trim().length === 0) return DESTINATIONS
    if (items === null) return []
    return search(items, query, RESULT_LIMIT).map((hit) => hit.item)
  }, [items, query])

  // The highlight can outlive the list it pointed into, so it is clamped on
  // read rather than chased with an effect that would render twice.
  const activeIndex = results.length === 0 ? -1 : Math.min(active, results.length - 1)
  const activeId = activeIndex >= 0 ? `${optionPrefix}-${activeIndex}` : undefined

  /* --- keep the highlighted row on screen -------------------------------- */
  useEffect(() => {
    if (!ready || activeIndex < 0) return
    const row = listRef.current?.children[activeIndex]
    // jsdom implements neither of these; the guard keeps the unit tests honest
    // about what they are asserting rather than stubbing the DOM.
    if (row instanceof HTMLElement && typeof row.scrollIntoView === 'function') {
      row.scrollIntoView({ block: 'nearest' })
    }
  }, [ready, activeIndex])

  const go = useCallback(
    (item: SearchItem) => {
      close()
      router.push(item.href)
    },
    [close, router],
  )

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActive((i) => (i + 1) % results.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setActive((i) => (i - 1 + results.length) % results.length)
        break
      case 'Home':
        event.preventDefault()
        setActive(0)
        break
      case 'End':
        event.preventDefault()
        setActive(results.length - 1)
        break
      case 'Enter': {
        if (activeIndex < 0) return
        event.preventDefault()
        go(results[activeIndex])
        break
      }
      default:
    }
  }

  if (!ready) return null

  const searching = query.trim().length > 0
  const count = results.length
  // The index arrives one microtask after the first open, so a fast typist can
  // get a keystroke in before it lands. That window is "still loading", not
  // "nothing matched", and saying the wrong one of those is worse than a blank.
  const loading = searching && items === null

  return createPortal(
    <div data-overlay="" className="fixed inset-0 z-50">
      {/* Flat tint, never blurred: the panel is the one blurred layer, and the
          `data-sheet="open"` switch flattens everything behind it. */}
      <div
        aria-hidden="true"
        onClick={close}
        className="absolute inset-0 bg-[var(--ground)]/75 motion-safe:transition-opacity"
      />
      {/* Full-bleed on a phone, a panel hung below the top edge on a desktop.
          One breakpoint, `md:` — the only one this theme has. */}
      <div className="absolute inset-0 flex items-stretch justify-center md:items-start md:p-6 md:pt-[9vh]">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelId}
          tabIndex={-1}
          data-testid="command-palette"
          className={cx(
            'raised flex h-full w-full min-w-0 flex-col rounded-none focus:outline-none',
            'md:h-auto md:max-h-[70vh] md:w-full md:max-w-[38rem] md:rounded-[var(--radius)]',
          )}
        >
          <h2 id={labelId} className="sr-only">
            Search the guide
          </h2>

          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--panel-border)] p-3">
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-[var(--text-faint)]"
            >
              <circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
              <path
                d="M13 13l4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
            <Input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-label="Search the guide"
              aria-expanded={count > 0}
              aria-controls={listId}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              aria-describedby={hintId}
              autoComplete="off"
              spellCheck={false}
              placeholder="Jump to a section, a problem, a question…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActive(0)
              }}
              onKeyDown={onKeyDown}
              className="border-0 bg-transparent px-0"
            />
            <button
              type="button"
              onClick={close}
              aria-label="Close search"
              className="btn btn-quiet min-w-11 shrink-0 px-0"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
                <path
                  d="M5 5l10 10M15 5L5 15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/*
            The count, announced. A combobox that silently swaps its options
            leaves a screen-reader user typing into a void — they hear the
            characters they typed and nothing about what came back. Polite, so
            it queues behind the character echo instead of cutting it off.
          */}
          <p aria-live="polite" role="status" className="sr-only">
            {loading ? 'Searching…' : searching ? `${count} ${count === 1 ? 'result' : 'results'}` : ''}
          </p>

          <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {count > 0 ? (
              <ul
                ref={listRef}
                id={listId}
                role="listbox"
                aria-label={searching ? 'Search results' : 'Sections'}
                className="flex min-w-0 flex-col"
              >
                {results.map((item, index) => (
                  <li
                    key={item.id}
                    id={`${optionPrefix}-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    data-active={index === activeIndex ? 'true' : undefined}
                    // Pointer down, not click: the mousedown would otherwise
                    // blur the input first and the activedescendant contract
                    // would break for the one frame before navigation.
                    onPointerDown={(event) => {
                      event.preventDefault()
                      go(item)
                    }}
                    onPointerMove={() => setActive(index)}
                    className={cx(
                      'flex min-h-11 min-w-0 cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2',
                      'motion-safe:transition-colors',
                      index === activeIndex
                        ? 'bg-[var(--accent-soft)] text-[var(--text)]'
                        : 'text-[var(--text)]',
                    )}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm">{item.title}</span>
                      {item.subtitle ? (
                        <span className="truncate text-xs text-[var(--text-muted)]">
                          {item.subtitle}
                        </span>
                      ) : null}
                    </span>
                    <Tag variant="outline" className="shrink-0">
                      {KIND_LABEL[item.kind]}
                    </Tag>
                  </li>
                ))}
              </ul>
            ) : loading ? (
              <p className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">Searching…</p>
            ) : (
              // Never just "no results": say what this box actually searches
              // and hand back a way out of the dead end.
              <EmptyState
                title={`Nothing matches “${query.trim()}”`}
                description="This searches sections, DSA problems, design and LLD questions, AI/ML, CS and hardware questions, readings, companies and behavioural prompts. Try a shorter word, a company name, or a pattern — “sliding window”, “amazon”, “kv cache”."
                action={
                  <button
                    type="button"
                    className="chip"
                    onClick={() => {
                      setQuery('')
                      setActive(0)
                      inputRef.current?.focus()
                    }}
                  >
                    Clear and show every section
                  </button>
                }
              />
            )}
          </div>

          <p
            id={hintId}
            className="shrink-0 border-t border-[var(--panel-border)] px-3 py-2 text-xs text-[var(--text-muted)]"
          >
            Arrow keys to move, Enter to open, Escape to close.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
