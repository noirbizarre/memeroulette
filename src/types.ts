export interface Meme {
  id: string
  name: string
  url: string
  pageUrl?: string
}

export interface Category {
  slug: string
  name: string
  count?: number
}

export interface MemeQuery {
  /** Restrict to a category. When omitted, all categories are considered. */
  category?: Category | null
  /** Free-text keyword/filter. When omitted, no text filtering is applied. */
  keyword?: string
  /** Cap how many memes are returned. */
  limit?: number
}

export interface MemeProvider {
  /** Stable identifier used in the registry and selector. */
  id: string
  /** Human-readable name shown in the UI. */
  name: string
  /** List the categories/collections available from this provider. */
  listCategories(): Promise<Category[]>
  /**
   * Fetch a pool of memes matching the query. The pool feeds the wheel and the
   * random pick. With no category and no keyword, returns a general pool.
   */
  listMemes(query?: MemeQuery): Promise<Meme[]>
}
