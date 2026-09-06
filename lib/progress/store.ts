'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { todayIso } from '@/lib/date'
import { emptyBlob, CURRENT_VERSION } from './types'
import type { ProgressBlob } from './types'
import { migrate } from './migrations'
import { safeGet, safeSet, safeRemove } from './storage'

export const STORAGE_KEY = 'aeg.progress.v1'

interface ProgressActions {
  setStartDate: (iso: string) => void
  toggle: (itemId: string) => void
  setHours: (date: string, hours: number) => void
  reset: () => void
  importBlob: (json: string) => void
  exportBlob: () => string
}

export type ProgressState = ProgressBlob & ProgressActions

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...emptyBlob(),

      setStartDate: (iso) => set({ startDate: iso }),

      toggle: (itemId) =>
        set((s) => {
          const next = { ...s.completed }
          if (next[itemId]) delete next[itemId]
          else next[itemId] = todayIso()
          return { completed: next }
        }),

      setHours: (date, hours) =>
        set((s) => ({ hours: { ...s.hours, [date]: hours } })),

      reset: () => {
        safeRemove(STORAGE_KEY)
        set(emptyBlob())
      },

      importBlob: (json) => {
        const blob = migrate(JSON.parse(json))
        set(blob)
      },

      exportBlob: () => {
        const s = get()
        const blob: ProgressBlob = {
          version: CURRENT_VERSION,
          startDate: s.startDate,
          completed: s.completed,
          hours: s.hours,
          settings: s.settings,
        }
        return JSON.stringify(blob, null, 2)
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => ({
        getItem: safeGet,
        setItem: safeSet,
        removeItem: safeRemove,
      })),
      partialize: (s) => ({
        version: s.version, startDate: s.startDate,
        completed: s.completed, hours: s.hours, settings: s.settings,
      }),
    },
  ),
)
