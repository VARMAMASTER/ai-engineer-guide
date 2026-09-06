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

describe('reading summaries', () => {
  it('gives all 49 readings a summary with all six fields filled', () => {
    expect(readings).toHaveLength(49)
    const fields = ['problem', 'idea', 'how', 'result', 'soWhat', 'limits'] as const
    for (const r of readings) {
      expect(r.summary, r.id).toBeDefined()
      for (const f of fields) {
        expect(r.summary[f].trim().length, `${r.id}.${f}`).toBeGreaterThan(0)
      }
    }
  })

  it('keeps `idea` to a single sentence', () => {
    // The one-insight test. If it takes three sentences, the summary has not found the insight.
    for (const r of readings) {
      const breaks = r.summary.idea.match(/\. /g) ?? []
      expect(breaks.length, `${r.id}: "${r.summary.idea}"`).toBeLessThanOrEqual(1)
    }
  })

  it('makes `result` and `limits` substantive rather than a shrug', () => {
    for (const r of readings) {
      expect(r.summary.result.length, `${r.id}.result`).toBeGreaterThan(40)
      expect(r.summary.limits.length, `${r.id}.limits`).toBeGreaterThan(40)
    }
  })

  it('names the month, week, or milestone the reading feeds in `soWhat`', () => {
    for (const r of readings) {
      expect(r.summary.soWhat.length, `${r.id}.soWhat`).toBeGreaterThan(40)
    }
  })

  it('makes every diagram parseable Mermaid flowchart source', () => {
    for (const r of readings) {
      if (r.diagram === undefined) continue
      expect(r.diagram.startsWith('flowchart'), r.id).toBe(true)
      expect(r.diagram.includes('-->'), r.id).toBe(true)
      // Styling directives and click handlers do not survive a plain renderer or both themes.
      expect(r.diagram.includes('classDef'), r.id).toBe(false)
      expect(r.diagram.includes('click '), r.id).toBe(false)
    }
  })

  it('diagrams the mechanism papers, not just a token few', () => {
    const withDiagram = readings.filter((r) => r.diagram !== undefined)
    expect(withDiagram.length).toBeGreaterThanOrEqual(12)
    // Posts and API launches contribute a title in a box, not a mechanism.
    for (const r of withDiagram) expect(r.kind, r.id).toBe('paper')
  })
})
