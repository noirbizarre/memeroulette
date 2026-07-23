<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import RouletteWheel from './components/RouletteWheel.vue'
import MemeReveal from './components/MemeReveal.vue'
import ProviderSelect from './components/ProviderSelect.vue'
import { providers, getProvider } from './providers'
import { shuffle } from './lib/picker'
import { buildSearch, parseDeepLink } from './lib/deeplink'
import type { Category, Meme, MemeProvider } from './types'

// Cap the number of wheel segments for readability.
const MAX_SEGMENTS = 10

const defaultProviderId = providers[0]?.id ?? ''

// Restore filters from the URL query string so shared deep links reopen with
// the same provider/category/keyword. Assigned synchronously during setup,
// before the watchers below are registered, so they are not reset on load.
const initial = parseDeepLink(window.location.search)

// Default to the first registered provider; the picker is shown when more than
// one provider is available. Unknown provider ids fall back to the default.
const providerId = ref<string>(
  initial.providerId && getProvider(initial.providerId) ? initial.providerId : defaultProviderId,
)
const provider = computed<MemeProvider>(() => getProvider(providerId.value) ?? providers[0])

const categorySlug = ref<string>(initial.categorySlug ?? '')
const keyword = ref<string>(initial.keyword ?? '')

// One-shot: auto-spin on the initial load only when the deep link requested it.
// Suppressed when a specific meme is being restored (we show it directly instead).
let pendingAutoSpin = initial.spin === true && !initial.meme

// One-shot: a shared result link carries a full meme to reveal directly, skipping
// the wheel. Consumed after the first `loadMemes()` so its `result = null` reset
// does not clobber the restored meme.
let pendingRestoreMeme: Meme | null = initial.meme ?? null

// Filters panel starts collapsed on mobile when the deep link auto-spins, so the
// full wheel is visible while it spins. (CSS only hides `.filters` <=640px.)
const filtersOpen = ref(initial.spin !== true)

function toggleFilters(): void {
  filtersOpen.value = !filtersOpen.value
}

const wheel = ref<InstanceType<typeof RouletteWheel> | null>(null)

const copied = ref(false)
let copiedTimer: number | undefined

// Transient "Copied!" state for the reveal's Share button (clipboard fallback).
const resultCopied = ref(false)
let resultCopiedTimer: number | undefined

const categories = ref<Category[]>([])
const categoriesLoading = ref(false)
const categoriesError = ref<string | null>(null)

// Full pool from the current query; the wheel is re-sampled from it on each spin.
const pool = ref<Meme[]>([])
const wheelMemes = ref<Meme[]>([])
const memesLoading = ref(false)
const memesError = ref<string | null>(null)

const spinning = ref(false)
const result = ref<Meme | null>(null)

const canSpin = computed(() => wheelMemes.value.length > 0 && !memesLoading.value)

// Only providers that declare keyword support get the Filter/keyword input.
const keywordSupported = computed(() => provider.value.supportsKeyword === true)

async function loadCategories(): Promise<void> {
  categoriesLoading.value = true
  categoriesError.value = null
  try {
    categories.value = await provider.value.listCategories()
  } catch (e) {
    categoriesError.value = e instanceof Error ? e.message : 'Failed to load categories.'
  } finally {
    categoriesLoading.value = false
  }
}

// Draw a fresh random set of wheel segments from the full query pool.
function resampleWheel(): void {
  wheelMemes.value = shuffle(pool.value).slice(0, MAX_SEGMENTS)
}

async function loadMemes(): Promise<void> {
  memesLoading.value = true
  memesError.value = null
  pool.value = []
  wheelMemes.value = []
  result.value = null
  let autoSpin = false
  try {
    const memes = await provider.value.listMemes({
      categorySlug: categorySlug.value || null,
      keyword: keyword.value,
      limit: 100,
    })
    if (memes.length === 0) {
      memesError.value = 'No memes matched. Try a different filter or category.'
      return
    }
    pool.value = memes
    resampleWheel()
    // Defer the auto-spin until after `memesLoading` clears below, otherwise the
    // wheel is still hidden behind the loading state and its ref is not mounted.
    autoSpin = pendingAutoSpin && wheelMemes.value.length > 0
  } catch (e) {
    memesError.value = e instanceof Error ? e.message : 'Failed to load memes.'
  } finally {
    memesLoading.value = false
  }

  // Reveal the shared meme directly on the first load, once the pool is ready so
  // "Spin again" has something to draw from. Consumed exactly once.
  if (pendingRestoreMeme && !memesError.value) {
    result.value = pendingRestoreMeme
    pendingRestoreMeme = null
    return
  }

  if (autoSpin) {
    pendingAutoSpin = false
    // Wait for the wheel to mount now that the loading state has cleared.
    await nextTick()
    // The wheel animates via a CSS transition on `transform`. Triggering the
    // spin in the same frame the element first mounts skips the transition (the
    // element is painted straight at its final rotation). Wait for two animation
    // frames so the browser paints the initial rotation before it changes.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    )
    wheel.value?.spin()
  }
}

// Keep the address bar in sync with the current filters (never adds the `spin`
// flag). Uses replaceState so live edits don't pollute browser history.
function writeUrl(): void {
  const search = buildSearch(
    { providerId: providerId.value, categorySlug: categorySlug.value, keyword: keyword.value },
    defaultProviderId,
  )
  history.replaceState(null, '', window.location.pathname + search)
}

let debounce: number | undefined
function scheduleLoad(): void {
  window.clearTimeout(debounce)
  debounce = window.setTimeout(() => {
    writeUrl()
    void loadMemes()
  }, 350)
}

watch(providerId, () => {
  // Switching provider invalidates the current categories and pool.
  categorySlug.value = ''
  keyword.value = ''
  result.value = null
  writeUrl()
  void loadCategories()
  void loadMemes()
})

watch(categorySlug, () => {
  result.value = null
  writeUrl()
  void loadMemes()
})

watch(keyword, () => {
  result.value = null
  scheduleLoad()
})

async function share(): Promise<void> {
  const search = buildSearch(
    {
      providerId: providerId.value,
      categorySlug: categorySlug.value,
      keyword: keyword.value,
      spin: true,
    },
    defaultProviderId,
  )
  const url = window.location.origin + window.location.pathname + search
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    window.prompt('Copy this link:', url)
    return
  }
  copied.value = true
  window.clearTimeout(copiedTimer)
  copiedTimer = window.setTimeout(() => (copied.value = false), 1500)
}

// Share the current spin result via a deep link that encodes the meme itself, so
// the recipient sees the exact same meme without a spin. Uses the native share
// sheet when available, falling back to copying the link to the clipboard.
async function shareResult(): Promise<void> {
  const meme = result.value
  if (!meme) return

  const search = buildSearch(
    {
      providerId: providerId.value,
      categorySlug: categorySlug.value,
      keyword: keyword.value,
      meme,
    },
    defaultProviderId,
  )
  const url = window.location.origin + window.location.pathname + search

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'Meme Roulette', text: meme.name, url })
      return
    } catch {
      // User dismissed the share sheet, or it is unavailable: fall back to copy.
    }
  }

  try {
    await navigator.clipboard.writeText(url)
  } catch {
    window.prompt('Copy this link:', url)
    return
  }
  resultCopied.value = true
  window.clearTimeout(resultCopiedTimer)
  resultCopiedTimer = window.setTimeout(() => (resultCopied.value = false), 1500)
}

function onResult(meme: Meme): void {
  result.value = meme
}

function again(): void {
  result.value = null
  // New spin: draw a fresh random selection from the full query result.
  resampleWheel()
}

onMounted(() => {
  void loadCategories()
  void loadMemes()
})
</script>

<template>
  <div class="app">
    <header class="topbar" :class="{ 'filters-open': filtersOpen }">
      <div class="topbar-head">
        <div class="brand">
          <h1>🎯 Meme Roulette</h1>
        </div>
        <button
          type="button"
          class="filters-toggle"
          :aria-expanded="filtersOpen"
          aria-controls="filters-panel"
          @click="toggleFilters"
        >
          <span aria-hidden="true">☰</span>
          <span class="sr-only">Filters</span>
        </button>
      </div>

      <div id="filters-panel" class="filters">
        <ProviderSelect v-if="providers.length > 1" v-model="providerId" :providers="providers" />

        <div class="field">
          <label for="category-select">Category</label>
          <select id="category-select" class="select" v-model="categorySlug">
            <option value="">All categories</option>
            <option v-for="c in categories" :key="c.slug" :value="c.slug">
              {{ c.name }}<template v-if="c.count"> ({{ c.count }})</template>
            </option>
          </select>
        </div>

        <div class="field grow" v-if="keywordSupported">
          <label for="keyword-input">Filter / keyword</label>
          <input
            id="keyword-input"
            class="input"
            type="search"
            placeholder="e.g. drake, cat, monday…"
            v-model="keyword"
          />
        </div>

        <div class="field">
          <label>&nbsp;</label>
          <button type="button" class="share-btn" @click="share">
            {{ copied ? 'Copied!' : 'Share' }}
          </button>
        </div>
      </div>
    </header>

    <div v-if="categoriesError" class="bar-error">
      <span>{{ categoriesError }}</span>
      <button type="button" class="link-btn" @click="loadCategories">Retry</button>
    </div>

    <main class="stage">
      <p v-if="memesLoading" class="hint">Loading memes…</p>

      <div v-else-if="memesError" class="error">
        <span>{{ memesError }}</span>
        <button type="button" class="link-btn" @click="loadMemes">Retry</button>
      </div>

      <template v-else>
        <RouletteWheel
          ref="wheel"
          v-show="!result"
          :memes="wheelMemes"
          :disabled="!canSpin"
          @result="onResult"
          @spinning="spinning = $event"
        />

        <MemeReveal
          v-if="result && !spinning"
          :meme="result"
          :copied="resultCopied"
          @again="again"
          @share="shareResult"
        />
      </template>
    </main>

    <footer class="footer">
      <span>No backend · powered by</span>
      <a href="https://justmeme.wtf" target="_blank" rel="noopener">justmeme.wtf</a>
    </footer>
  </div>
</template>
