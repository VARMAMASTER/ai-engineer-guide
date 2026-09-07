'use client'

import { useSyncExternalStore } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { safeGet, safeSet, safeRemove } from './storage'

export const STORY_STORAGE_KEY = 'aeg.stories.v1'

/** The four STAR fields the user writes against a slot's prompts. */
export interface StoryDraft {
  situation: string
  task: string
  action: string
  result: string
}

export const STAR_FIELDS = ['situation', 'task', 'action', 'result'] as const

export type StarField = (typeof STAR_FIELDS)[number]

export const EMPTY_DRAFT: StoryDraft = { situation: '', task: '', action: '', result: '' }

interface StoryState {
  drafts: Record<string, StoryDraft>
  setField: (storyId: string, field: StarField, value: string) => void
  clearStory: (storyId: string) => void
  reset: () => void
}

/**
 * Story drafts live in their own persisted store, under their own key.
 *
 * They could have been a slice of `useProgress`, and the shape below is
 * deliberately the same one — zustand `persist` over the same `safeGet`/
 * `safeSet` wrappers, so a browser with storage blocked degrades to an
 * in-memory session rather than throwing. What stopped them going in the
 * progress blob is that `progressBlobSchema` is versioned and exported
 * verbatim by Settings: adding a field there is a v3 migration and a change to
 * the export format, which is a much larger blast radius than a fifteen-slot
 * drafting pad deserves.
 *
 * The line between the two keys is the same one `completed` and `revision`
 * already draw: `completed` records "I practised this"; `drafts` holds prose
 * the user typed. They are different kinds of fact and neither can be derived
 * from the other.
 */
export const useStories = create<StoryState>()(
  persist(
    (set) => ({
      drafts: {},

      setField: (storyId, field, value) =>
        set((s) => ({
          drafts: {
            ...s.drafts,
            [storyId]: { ...EMPTY_DRAFT, ...s.drafts[storyId], [field]: value },
          },
        })),

      clearStory: (storyId) =>
        set((s) => {
          const next = { ...s.drafts }
          delete next[storyId]
          return { drafts: next }
        }),

      reset: () => {
        safeRemove(STORY_STORAGE_KEY)
        set({ drafts: {} })
      },
    }),
    {
      name: STORY_STORAGE_KEY,
      storage: createJSONStorage(() => ({
        getItem: safeGet,
        setItem: safeSet,
        removeItem: safeRemove,
      })),
      partialize: (s) => ({ drafts: s.drafts }),
    },
  ),
)

/** A draft counts as started once any one of the four fields has real text. */
export function isDrafted(draft: StoryDraft | undefined): boolean {
  return draft !== undefined && STAR_FIELDS.some((f) => draft[f].trim().length > 0)
}

/** How many of the four STAR fields have been written. */
export function filledFields(draft: StoryDraft | undefined): number {
  if (!draft) return 0
  return STAR_FIELDS.filter((f) => draft[f].trim().length > 0).length
}

/* --------------------------------------------------------------------------
 * Hydration latch
 *
 * Same shape as `useHydrated`, against this store rather than the progress one.
 * Server markup cannot know what is in storage, so every draft renders empty
 * until the client says otherwise — a textarea whose `value` differs between
 * server and client HTML is a hydration mismatch, not a cosmetic flicker.
 * ----------------------------------------------------------------------- */

let finished = false

const subscribe = (onStoreChange: () => void) =>
  useStories.persist.onFinishHydration(() => {
    finished = true
    onStoreChange()
  })

const getSnapshot = () => finished || useStories.persist.hasHydrated()
const getServerSnapshot = () => false

export function useStoriesHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
