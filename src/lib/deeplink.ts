// Deep-link helpers: encode/decode provider, category and keyword filters in the
// URL query string so selections can be shared and restored. Pure and DOM-free
// so they can be unit-tested in isolation.

import type { Meme } from '../types'

export interface DeepLinkState {
  providerId?: string
  categorySlug?: string
  keyword?: string
  spin?: boolean
  /** A specific revealed meme, so a spin result can be shared and restored. */
  meme?: Meme
}

/**
 * Parse a URL query string (e.g. `?provider=local&category=cats&q=drake&spin=1`)
 * into a {@link DeepLinkState}. Empty or whitespace-only values are treated as
 * absent. `spin` is truthy only when it equals the string `"1"`.
 */
export function parseDeepLink(search: string): DeepLinkState {
  const params = new URLSearchParams(search)
  const state: DeepLinkState = {}

  const provider = params.get('provider')?.trim()
  if (provider) state.providerId = provider

  const category = params.get('category')?.trim()
  if (category) state.categorySlug = category

  const keyword = params.get('q')?.trim()
  if (keyword) state.keyword = keyword

  if (params.get('spin') === '1') state.spin = true

  // A shared result carries the full meme. It requires at least an id (`m`) and
  // an image url (`mu`); the name (`mn`) falls back to the id when absent.
  const memeId = params.get('m')?.trim()
  const memeUrl = params.get('mu')?.trim()
  if (memeId && memeUrl) {
    const memeName = params.get('mn')?.trim()
    const memePageUrl = params.get('mp')?.trim()
    state.meme = {
      id: memeId,
      name: memeName || memeId,
      url: memeUrl,
      ...(memePageUrl ? { pageUrl: memePageUrl } : {}),
    }
  }

  return state
}

/**
 * Build a URL query string from a {@link DeepLinkState}. The provider is omitted
 * when it matches `defaultProviderId`; empty category/keyword are omitted; `spin=1`
 * is included only when `state.spin` is true. Returns an empty string when no
 * params are present (leading `?` is included otherwise).
 */
export function buildSearch(state: DeepLinkState, defaultProviderId: string): string {
  const params = new URLSearchParams()

  const providerId = state.providerId?.trim()
  if (providerId && providerId !== defaultProviderId) {
    params.set('provider', providerId)
  }

  const categorySlug = state.categorySlug?.trim()
  if (categorySlug) params.set('category', categorySlug)

  const keyword = state.keyword?.trim()
  if (keyword) params.set('q', keyword)

  if (state.spin) params.set('spin', '1')

  // Encode a specific revealed meme so a spin result can be shared verbatim,
  // without any network lookup on the receiving end.
  const meme = state.meme
  if (meme?.id && meme.url) {
    params.set('m', meme.id)
    params.set('mn', meme.name)
    params.set('mu', meme.url)
    if (meme.pageUrl) params.set('mp', meme.pageUrl)
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}
