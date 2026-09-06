import { describe, it, expect } from 'vitest'
import { projects, milestones } from '@/content/projects'
import { readings } from '@/content/readings'
import { allDocs, docsForProject } from '@/lib/content/index'

describe('projects bank', () => {
  it('has one project per month, months 1 to 6', () => {
    expect(projects).toHaveLength(6)
    expect(projects.map((p) => p.month).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('gives every project exactly four milestones with orders 1 to 4', () => {
    expect(milestones).toHaveLength(24)
    for (const p of projects) {
      const ms = milestones.filter((m) => m.projectId === p.id)
      expect(ms.map((m) => m.order).sort((a, b) => a - b), p.id).toEqual([1, 2, 3, 4])
    }
  })

  it('makes every milestone a 10-hour weekend pair', () => {
    for (const m of milestones) expect(m.hours, m.id).toBe(10)
  })

  it('generates seven defense docs per project', () => {
    expect(allDocs).toHaveLength(42)
    expect(docsForProject('proj-rag').map((d) => d.name)).toEqual([
      'problem', 'architecture', 'ml', 'tradeoffs', 'scaling', 'failures', 'interview-questions',
    ])
  })

  it('gives the month 1 project full detail', () => {
    const rag = projects.find((p) => p.id === 'proj-rag')!
    expect(rag.defense.length).toBeGreaterThanOrEqual(8)
    expect(rag.constraints.length).toBeGreaterThanOrEqual(4)
    for (const m of milestones.filter((m) => m.projectId === 'proj-rag')) {
      expect(m.scope.length, m.id).toBeGreaterThanOrEqual(3)
      expect(m.acceptance.length, m.id).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('readings bank', () => {
  it('has at least 40 readings', () => {
    expect(readings.length).toBeGreaterThanOrEqual(40)
  })

  it('assigns week 1 the RAG paper and the September 2026 API launches', () => {
    const w1 = readings.filter((r) => r.weekId === 'week-01')
    expect(w1.some((r) => r.id === 'read-rag-2020')).toBe(true)
    expect(w1.filter((r) => r.kind === 'api')).toHaveLength(3)
  })

  it('uses the default minutes for each kind', () => {
    const defaults = { paper: 35, post: 25, api: 10 } as const
    for (const r of readings) expect(r.minutes, r.id).toBe(defaults[r.kind])
  })

  it('gives every reading a working-shaped url and a reason', () => {
    for (const r of readings) {
      expect(r.url.startsWith('https://'), r.id).toBe(true)
      expect(r.why.length, r.id).toBeGreaterThan(20)
    }
  })
})
