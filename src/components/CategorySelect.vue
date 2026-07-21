<script setup lang="ts">
import type { Category } from '../types'

defineProps<{
  categories: Category[]
  modelValue: string | null
  loading: boolean
  error: string | null
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'retry'): void
}>()
</script>

<template>
  <div class="field">
    <label for="category-select">Category</label>

    <p v-if="loading" class="hint">Loading categories…</p>

    <div v-else-if="error" class="error">
      <span>{{ error }}</span>
      <button type="button" class="link-btn" @click="$emit('retry')">Retry</button>
    </div>

    <select
      v-else
      id="category-select"
      class="select"
      :value="modelValue ?? ''"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>Choose a category…</option>
      <option v-for="c in categories" :key="c.slug" :value="c.slug">
        {{ c.name }}<template v-if="c.count"> ({{ c.count }})</template>
      </option>
    </select>
  </div>
</template>
