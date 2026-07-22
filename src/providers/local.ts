import { registry } from 'virtual:local-memes'
import type { Category, Meme, MemeProvider, MemeQuery } from '../types'

/**
 * Build a servable URL for a meme file. Files live under `public/memes/`, so
 * the URL is the deploy base (which already ends with `/`) plus `memes/<file>`.
 */
function toUrl(file: string): string {
  return `${import.meta.env.BASE_URL}memes/${file}`
}

/**
 * Serves memes from local image files laid out as
 * `public/memes/<category>/<image>`. The registry is generated at build time
 * by the `local-memes` Vite plugin and imported via `virtual:local-memes`.
 */
export class LocalProvider implements MemeProvider {
  readonly id = 'local'
  readonly name = 'Local'

  async listCategories(): Promise<Category[]> {
    return registry.categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      count: c.count,
    }))
  }

  async listMemes(query: MemeQuery = {}): Promise<Meme[]> {
    const { category, keyword, limit = 50 } = query
    const capped = Math.min(Math.max(limit, 1), 100)

    let pool = category
      ? (registry.memes[category.slug] ?? [])
      : Object.values(registry.memes).flat()

    const kw = keyword?.trim().toLowerCase() ?? ''
    if (kw.length >= 2) {
      pool = pool.filter((m) => m.name.toLowerCase().includes(kw))
    }

    return pool.slice(0, capped).map((m) => ({
      id: m.id,
      name: m.name,
      url: toUrl(m.file),
    }))
  }
}

export const localProvider = new LocalProvider()
