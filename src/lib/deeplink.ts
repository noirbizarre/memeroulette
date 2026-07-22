// Deep-link helpers: encode/decode provider, category and keyword filters in the
// URL query string so selections can be shared and restored. Pure and DOM-free
// so they can be unit-tested in isolation.

export interface DeepLinkState {
  providerId?: string
  categorySlug?: string
  keyword?: string
  spin?: boolean
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

  const query = params.toString()
  return query ? `?${query}` : ''
}
