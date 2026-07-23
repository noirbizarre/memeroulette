import { describe, expect, it } from 'vitest'
import { registry } from 'virtual:local-memes'
import { LocalProvider } from './local'

// These tests run against whatever is committed under `public/memes/`. They are
// written against the generated registry rather than hard-coded file names so
// they stay valid as the seed content changes. (See plugins/local-memes.test.ts
// for exhaustive registry-derivation coverage.)
describe('LocalProvider', () => {
  const provider = new LocalProvider()

  const firstCategory = registry.categories[0]
  const allMemes = Object.values(registry.memes).flat()

  it('exposes an id and name', () => {
    expect(provider.id).toBe('local')
    expect(provider.name).toBe('Local')
  })

  it('has at least one category and one meme in the seed content', () => {
    expect(registry.categories.length).toBeGreaterThan(0)
    expect(allMemes.length).toBeGreaterThan(0)
  })

  it('lists categories mirroring the generated registry', async () => {
    const categories = await provider.listCategories()
    expect(categories).toEqual(
      registry.categories.map((c) => ({ slug: c.slug, name: c.name, count: c.count })),
    )
  })

  it('returns memes for a category with base-prefixed urls', async () => {
    const memes = await provider.listMemes({
      categorySlug: firstCategory.slug,
    })
    const expected = registry.memes[firstCategory.slug]
    expect(memes).toHaveLength(expected.length)
    expect(memes[0]).toEqual({
      id: expected[0].id,
      name: expected[0].name,
      url: `${import.meta.env.BASE_URL}memes/${expected[0].file}`,
    })
  })

  it('returns a general pool across all categories when no category is given', async () => {
    const memes = await provider.listMemes({ limit: 100 })
    expect(memes).toHaveLength(Math.min(allMemes.length, 100))
  })

  it('filters by keyword when at least 2 characters are provided', async () => {
    // Use a substring of an existing meme name to guarantee a deterministic hit.
    const target = allMemes[0]
    const kw = target.name.slice(0, 2).toLowerCase()
    const memes = await provider.listMemes({ keyword: kw })
    expect(memes.length).toBeGreaterThan(0)
    expect(memes.every((m) => m.name.toLowerCase().includes(kw))).toBe(true)
  })

  it('ignores keywords shorter than 2 characters', async () => {
    const filtered = await provider.listMemes({ keyword: 'd', limit: 100 })
    const all = await provider.listMemes({ limit: 100 })
    expect(filtered.length).toBe(all.length)
  })

  it('caps the limit to at least 1', async () => {
    const memes = await provider.listMemes({ limit: 0 })
    expect(memes).toHaveLength(1)
  })
})
