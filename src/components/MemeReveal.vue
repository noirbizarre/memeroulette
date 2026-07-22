<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Meme } from '../types'

const props = defineProps<{
  meme: Meme | null
  /** Show a transient "Copied!" state on the Share button (clipboard fallback). */
  copied?: boolean
}>()

defineEmits<{
  (e: 'again'): void
  (e: 'share'): void
}>()

const imageError = ref(false)

watch(
  () => props.meme,
  () => {
    imageError.value = false
  },
)
</script>

<template>
  <div v-if="meme" class="reveal">
    <h2 class="reveal-title">{{ meme.name }}</h2>

    <div class="image-box">
      <img
        v-if="!imageError"
        :src="meme.url"
        :alt="meme.name"
        loading="lazy"
        @error="imageError = true"
      />
      <p v-else class="image-fallback">Image failed to load.</p>
    </div>

    <div class="reveal-actions">
      <button type="button" class="again-btn" @click="$emit('again')">Spin again</button>
      <button type="button" class="share-btn" @click="$emit('share')">
        {{ copied ? 'Copied!' : 'Share' }}
      </button>
      <a v-if="meme.pageUrl" :href="meme.pageUrl" target="_blank" rel="noopener" class="link">
        View on justmeme.wtf ↗
      </a>
    </div>
  </div>
</template>

<style scoped>
.reveal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  animation: pop 0.35s ease;
}

@keyframes pop {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.reveal-title {
  margin: 0;
  font-size: 1.4rem;
  text-align: center;
}

.image-box {
  max-width: 100%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
}

.image-box img {
  display: block;
  max-width: 100%;
  max-height: 60vh;
}

.image-fallback {
  padding: 2rem;
  color: #ffd166;
}

.reveal-actions {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
  justify-content: center;
}

.again-btn {
  font-weight: 700;
  padding: 0.6rem 1.75rem;
  border: 2px solid #fff;
  border-radius: 999px;
  background: transparent;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s ease;
}

.again-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.link {
  color: #06d6a0;
  text-decoration: none;
  font-weight: 600;
}

.link:hover {
  text-decoration: underline;
}
</style>
