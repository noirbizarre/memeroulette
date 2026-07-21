<script setup lang="ts">
import type { MemeProvider } from '../types'

defineProps<{
  providers: MemeProvider[]
  modelValue: string | null
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <div class="field">
    <label for="provider-select">Provider</label>
    <select
      id="provider-select"
      class="select"
      :value="modelValue ?? ''"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>Choose a provider…</option>
      <option v-for="p in providers" :key="p.id" :value="p.id">
        {{ p.name }}
      </option>
    </select>
  </div>
</template>
