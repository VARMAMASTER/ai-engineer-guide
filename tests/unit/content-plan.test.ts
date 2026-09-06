import { describe, it, expect } from 'vitest'
import { weeks, days } from '@/content/plan'
import { content, completionKey } from '@/lib/content/index'
import { validate } from '@/scripts/validate-content'
import type { ValidatableContent } from '@/scripts/validate-content'

describe('plan', () => {
  it('has 26 weeks mapped to six months', () => {
    expect(weeks).toHaveLength(26)
    expect(weeks.map((w) => w.number)).toEqual(Array.from({ length: 26 }, (_, i) => i + 1))
    expect(weeks.filter((w) => w.month === 1).map((w) => w.number)).toEqual([1, 2, 3, 4])
  })

  it('has 30 days numbered 1 to 30', () => {
    expect(days).toHaveLength(30)
    expect(days.map((d) => d.number)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1))
  })

  it('marks days 29 and 30 special and the rest by weekday or weekend', () => {
    for (const d of days) {
      const dow = ((d.number - 1) % 7) + 1 // 1 = Monday
      const expected = d.number > 28 ? 'special' : dow >= 6 ? 'weekend' : 'weekday'
      expect(d.kind, d.id).toBe(expected)
    }
  })

  it('plans exactly 1350 minutes in each of weeks 1 to 4', () => {
    for (const w of weeks.filter((x) => x.month === 1)) {
      const total = days
        .filter((d) => d.weekId === w.id && d.number <= 28)
        .flatMap((d) => d.tasks)
        .reduce((s, t) => s + t.minutes, 0)
      expect(total, w.id).toBe(1350)
    }
  })

  it('gives every weekday two DSA tasks of 30 minutes', () => {
    for (const d of days.filter((x) => x.kind === 'weekday')) {
      const dsa = d.tasks.filter((t) => t.track === 'dsa')
      expect(dsa, d.id).toHaveLength(2)
      for (const t of dsa) expect(t.minutes, d.id).toBe(30)
    }
  })

  it('schedules exactly 40 distinct DSA problems across days 1 to 28', () => {
    const ids = days
      .filter((d) => d.number <= 28)
      .flatMap((d) => d.tasks)
      .filter((t) => t.track === 'dsa')
      .map((t) => t.refId)
    expect(ids).toHaveLength(40)
    expect(new Set(ids).size).toBe(40)
  })

  it('schedules 8 system design patterns in month 1, six general and two ml', () => {
    const ids = days
      .filter((d) => d.number <= 28)
      .flatMap((d) => d.tasks)
      .filter((t) => t.track === 'study-sd')
      .map((t) => t.refId)
    expect(ids).toHaveLength(8)
    expect(ids.filter((i) => i.startsWith('sdp-'))).toHaveLength(6)
    expect(ids.filter((i) => i.startsWith('mlp-'))).toHaveLength(2)
  })

  it('gives every weekend day a build session keyed to that day', () => {
    for (const d of days.filter((x) => x.kind === 'weekend')) {
      const build = d.tasks.find((t) => t.track === 'build')
      expect(build, d.id).toBeDefined()
      expect(build!.taskId, d.id).toBe(`${d.id}-build`)
    }
  })

  it('has an acceptance task for each of the four RAG milestones', () => {
    const accepted = days
      .flatMap((d) => d.tasks)
      .filter((t) => t.refId.startsWith('ms-rag-') && !t.taskId)
      .map((t) => t.refId)
    expect(accepted.sort()).toEqual(['ms-rag-1', 'ms-rag-2', 'ms-rag-3', 'ms-rag-4'])
  })

  it('uses unique completion keys everywhere', () => {
    const keys = days.flatMap((d) => d.tasks).map(completionKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('passes full content validation', () => {
    expect(validate(content as ValidatableContent)).toEqual([])
  })
})
