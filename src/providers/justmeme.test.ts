import { afterEach, describe, expect, it, vi } from 'vitest'
import { JustMemeProvider } from './justmeme'

function mockFetch(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    })) as unknown as typeof fetch,
  )
}

describe('JustMemeProvider', () => {
  const provider = new JustMemeProvider()

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('maps categories from the API response', async () => {
    mockFetch(200, {
      success: true,
      categories: [
        { slug: 'reaction', name: 'reaction', count: 342 },
        { slug: 'animal', name: 'animal', count: 156 },
      ],
    })

    const categories = await provider.listCategories()
    expect(categories).toEqual([
      { slug: 'reaction', name: 'reaction', count: 342 },
      { slug: 'animal', name: 'animal', count: 156 },
    ])
  })

  it('maps templates to memes and derives pageUrl', async () => {
    mockFetch(200, {
      success: true,
      templates: [
        {
          id: 'drake-hotline-bling',
          name: 'Drake Hotline Bling',
          slug: 'drake-hotline-bling',
          url: 'https://i.imgflip.com/30b1gx.jpg',
          categories: ['reaction'],
        },
      ],
      total: 1,
    })

    const memes = await provider.listMemes({ categorySlug: 'reaction' })
    expect(memes).toEqual([
      {
        id: 'drake-hotline-bling',
        name: 'Drake Hotline Bling',
        url: 'https://i.imgflip.com/30b1gx.jpg',
        pageUrl: 'https://justmeme.wtf/meme/drake-hotline-bling',
      },
    ])
  })

  it('caps the requested limit at 100 and passes the category slug', async () => {
    const fetchMock = vi.fn(async (_input: string) => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, templates: [] }),
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await provider.listMemes({ categorySlug: 'animal', limit: 500 })

    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).toContain('category=animal')
    expect(calledUrl).toContain('limit=100')
  })

  it('uses the search endpoint when a keyword is provided', async () => {
    const fetchMock = vi.fn(async (_input: string) => ({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        templates: [
          {
            id: 'drake-hotline-bling',
            name: 'Drake Hotline Bling',
            slug: 'drake-hotline-bling',
            url: 'https://i.imgflip.com/30b1gx.jpg',
            categories: ['reaction'],
          },
        ],
      }),
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const memes = await provider.listMemes({ keyword: 'drake' })

    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).toContain('/templates/search?')
    expect(calledUrl).toContain('q=drake')
    expect(memes).toHaveLength(1)
  })

  it('omits the category param when none is given', async () => {
    const fetchMock = vi.fn(async (_input: string) => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, templates: [] }),
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await provider.listMemes()

    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).toContain('/templates?')
    expect(calledUrl).not.toContain('category=')
  })

  it('throws a friendly message on rate limit (429)', async () => {
    mockFetch(429, { success: false, error: 'Too Many Requests' })
    await expect(provider.listCategories()).rejects.toThrow(/rate limit/i)
  })

  it('surfaces the API error message on failure', async () => {
    mockFetch(400, { success: false, error: 'Missing or invalid parameters' })
    await expect(provider.listCategories()).rejects.toThrow('Missing or invalid parameters')
  })

  it('throws on a network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }) as unknown as typeof fetch,
    )
    await expect(provider.listCategories()).rejects.toThrow(/network error/i)
  })
})
