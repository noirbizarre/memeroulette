<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import RouletteWheel from './components/RouletteWheel.vue'
import MemeReveal from './components/MemeReveal.vue'
import { providers } from './providers'
import { shuffle } from './lib/picker'
import type { Category, Meme } from './types'

// Cap the number of wheel segments for readability.
const MAX_SEGMENTS = 10

// Provider selection is hidden for now: default to the first registered provider.
const provider = providers[0]

const categorySlug = ref<string>('')
const keyword = ref<string>('')

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

const selectedCategory = computed<Category | null>(
  () => categories.value.find((c) => c.slug === categorySlug.value) ?? null,
)
const canSpin = computed(() => wheelMemes.value.length > 0 && !memesLoading.value)

async function loadCategories(): Promise<void> {
  categoriesLoading.value = true
  categoriesError.value = null
  try {
    categories.value = await provider.listCategories()
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
  try {
    const memes = await provider.listMemes({
      category: selectedCategory.value,
      keyword: keyword.value,
      limit: 100,
    })
    if (memes.length === 0) {
      memesError.value = 'No memes matched. Try a different filter or category.'
      return
    }
    pool.value = memes
    resampleWheel()
  } catch (e) {
    memesError.value = e instanceof Error ? e.message : 'Failed to load memes.'
  } finally {
    memesLoading.value = false
  }
}

let debounce: number | undefined
function scheduleLoad(): void {
  window.clearTimeout(debounce)
  debounce = window.setTimeout(() => void loadMemes(), 350)
}

watch(categorySlug, () => {
  result.value = null
  void loadMemes()
})

watch(keyword, () => {
  result.value = null
  scheduleLoad()
})

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
    <header class="topbar">
      <div class="brand">
        <h1>🎯 Meme Roulette</h1>
      </div>

      <div class="filters">
        <div class="field">
          <label for="category-select">Category</label>
          <select id="category-select" class="select" v-model="categorySlug">
            <option value="">All categories</option>
            <option v-for="c in categories" :key="c.slug" :value="c.slug">
              {{ c.name }}<template v-if="c.count"> ({{ c.count }})</template>
            </option>
          </select>
        </div>

        <div class="field grow">
          <label for="keyword-input">Filter / keyword</label>
          <input
            id="keyword-input"
            class="input"
            type="search"
            placeholder="e.g. drake, cat, monday…"
            v-model="keyword"
          />
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
          v-show="!result"
          :memes="wheelMemes"
          :disabled="!canSpin"
          @result="onResult"
          @spinning="spinning = $event"
        />

        <MemeReveal v-if="result && !spinning" :meme="result" @again="again" />
      </template>
    </main>

    <footer class="footer">
      <span>No backend · powered by</span>
      <a href="https://justmeme.wtf" target="_blank" rel="noopener">justmeme.wtf</a>
    </footer>
  </div>
</template>
