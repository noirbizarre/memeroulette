import type { Category, Meme, MemeProvider, MemeQuery } from '../types'

const BASE_URL = 'https://justmeme.wtf/api/v1'

interface ApiCategory {
  slug: string
  name: string
  count?: number
}

interface ApiTemplate {
  id: string
  name: string
  slug: string
  url: string
  categories?: string[]
}

interface CategoriesResponse {
  success: boolean
  categories?: ApiCategory[]
  error?: string
}

interface TemplatesResponse {
  success: boolean
  templates?: ApiTemplate[]
  total?: number
  error?: string
}

async function getJson<T extends { success: boolean; error?: string }>(
  path: string,
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`)
  } catch {
    throw new Error('Network error while contacting justmeme.wtf. Check your connection.')
  }

  if (res.status === 429) {
    throw new Error('Rate limit reached (60 requests/minute). Please wait a moment and retry.')
  }

  let data: T
  try {
    data = (await res.json()) as T
  } catch {
    throw new Error(`justmeme.wtf returned an invalid response (HTTP ${res.status}).`)
  }

  if (!res.ok || !data.success) {
    throw new Error(data.error || `justmeme.wtf request failed (HTTP ${res.status}).`)
  }
  return data
}

function templateToMeme(t: ApiTemplate): Meme {
  return {
    id: t.id ?? t.slug,
    name: t.name,
    url: t.url,
    pageUrl: `https://justmeme.wtf/meme/${t.slug}`,
  }
}

export class JustMemeProvider implements MemeProvider {
  readonly id = 'justmeme'
  readonly name = 'justmeme.wtf'
  readonly supportsKeyword = true

  async listCategories(): Promise<Category[]> {
    const data = await getJson<CategoriesResponse>('/categories')
    return (data.categories ?? []).map((c) => ({
      slug: c.slug,
      name: c.name,
      count: c.count,
    }))
  }

  async listMemes(query: MemeQuery = {}): Promise<Meme[]> {
    const { category, keyword, limit = 50 } = query
    const capped = Math.min(Math.max(limit, 1), 100)
    const trimmed = keyword?.trim() ?? ''

    // The search endpoint requires at least 2 characters and does not support a
    // category filter, so we search then filter by category client-side.
    if (trimmed.length >= 2) {
      const params = new URLSearchParams({ q: trimmed })
      const data = await getJson<TemplatesResponse>(`/templates/search?${params.toString()}`)
      let memes = (data.templates ?? []).map(templateToMeme)
      if (category) {
        const withCat = (data.templates ?? []).filter((t) =>
          (t.categories ?? []).includes(category.slug),
        )
        // Only narrow when the category filter still leaves matches.
        if (withCat.length > 0) memes = withCat.map(templateToMeme)
      }
      return memes.slice(0, capped)
    }

    const params = new URLSearchParams({ limit: String(capped), page: '1' })
    if (category) params.set('category', category.slug)
    const data = await getJson<TemplatesResponse>(`/templates?${params.toString()}`)
    return (data.templates ?? []).map(templateToMeme)
  }
}

export const justMemeProvider = new JustMemeProvider()
