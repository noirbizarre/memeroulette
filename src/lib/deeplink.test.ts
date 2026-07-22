import { describe, expect, it } from 'vitest'
import { buildSearch, parseDeepLink } from './deeplink'

describe('parseDeepLink', () => {
  it('parses a full link', () => {
    expect(parseDeepLink('?provider=justmeme&category=cats&q=drake&spin=1')).toEqual({
      providerId: 'justmeme',
      categorySlug: 'cats',
      keyword: 'drake',
      spin: true,
    })
  })

  it('parses partial links', () => {
    expect(parseDeepLink('?q=monday')).toEqual({ keyword: 'monday' })
    expect(parseDeepLink('?category=cats')).toEqual({ categorySlug: 'cats' })
    expect(parseDeepLink('?provider=local')).toEqual({ providerId: 'local' })
  })

  it('returns an empty state for an empty search', () => {
    expect(parseDeepLink('')).toEqual({})
    expect(parseDeepLink('?')).toEqual({})
  })

  it('treats empty or whitespace values as absent', () => {
    expect(parseDeepLink('?provider=&category=%20&q=')).toEqual({})
  })

  it('only treats spin=1 as truthy', () => {
    expect(parseDeepLink('?spin=1').spin).toBe(true)
    expect(parseDeepLink('?spin=0').spin).toBeUndefined()
    expect(parseDeepLink('?spin=true').spin).toBeUndefined()
    expect(parseDeepLink('?spin=').spin).toBeUndefined()
  })

  it('trims values', () => {
    expect(parseDeepLink('?q=%20drake%20')).toEqual({ keyword: 'drake' })
  })
})

describe('buildSearch', () => {
  const DEFAULT = 'local'

  it('omits the default provider', () => {
    expect(buildSearch({ providerId: 'local' }, DEFAULT)).toBe('')
  })

  it('includes a non-default provider', () => {
    expect(buildSearch({ providerId: 'justmeme' }, DEFAULT)).toBe('?provider=justmeme')
  })

  it('omits empty category and keyword', () => {
    expect(buildSearch({ categorySlug: '', keyword: '   ' }, DEFAULT)).toBe('')
  })

  it('includes spin=1 only when requested', () => {
    expect(buildSearch({ keyword: 'cat', spin: true }, DEFAULT)).toBe('?q=cat&spin=1')
    expect(buildSearch({ keyword: 'cat' }, DEFAULT)).toBe('?q=cat')
  })

  it('returns an empty string when no params are present', () => {
    expect(buildSearch({}, DEFAULT)).toBe('')
  })

  it('round-trips a non-default provider with category and keyword', () => {
    const state = { providerId: 'justmeme', categorySlug: 'cats', keyword: 'drake' }
    const search = buildSearch(state, DEFAULT)
    expect(parseDeepLink(search)).toEqual(state)
  })
})
