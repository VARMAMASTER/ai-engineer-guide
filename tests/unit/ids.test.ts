import { describe, it, expect } from 'vitest'
import { slugOf, idFromSlug } from '@/lib/content/ids'

describe('id helpers', () => {
  it('strips a known prefix', () => {
    expect(slugOf('dsap-arrays-hashing')).toBe('arrays-hashing')
    expect(slugOf('sdp-caching')).toBe('caching')
    expect(slugOf('topic-transformers')).toBe('transformers')
    expect(slugOf('proj-rag')).toBe('rag')
    expect(slugOf('mlp-rag-systems')).toBe('rag-systems')
  })

  it('round-trips', () => {
    expect(idFromSlug('dsap', slugOf('dsap-arrays-hashing'))).toBe('dsap-arrays-hashing')
  })

  it('leaves an unknown prefix alone', () => {
    expect(slugOf('review-week')).toBe('review-week')
  })
})
