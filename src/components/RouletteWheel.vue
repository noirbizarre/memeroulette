<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Meme } from '../types'
import { randomIndex } from '../lib/picker'

const props = defineProps<{
  memes: Meme[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'result', meme: Meme): void
  (e: 'spinning', value: boolean): void
}>()

// viewBox size; the SVG scales responsively to its container.
const SIZE = 600
const CENTER = SIZE / 2
const RADIUS = CENTER
const PALETTE = [
  '#ef476f',
  '#ffd166',
  '#06d6a0',
  '#118ab2',
  '#8338ec',
  '#fb5607',
  '#3a86ff',
  '#f15bb5',
]

const rotation = ref(0)
const spinning = ref(false)

interface Segment {
  meme: Meme
  color: string
  path: string
  clipId: string
  imgTransform: string
  midDeg: number
}

const segments = computed<Segment[]>(() => {
  const n = props.memes.length
  if (n === 0) return []
  const step = 360 / n
  return props.memes.map((meme, i) => {
    const start = i * step
    const end = start + step
    const mid = start + step / 2
    return {
      meme,
      color: PALETTE[i % PALETTE.length],
      path: arcPath(start, end),
      clipId: `seg-clip-${i}`,
      imgTransform: imageTransform(mid),
      midDeg: mid,
    }
  })
})

function polar(angleDeg: number, r: number): [number, number] {
  // 0deg points up; clockwise positive.
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return [CENTER + r * Math.cos(rad), CENTER + r * Math.sin(rad)]
}

function arcPath(startDeg: number, endDeg: number): string {
  const [x1, y1] = polar(startDeg, RADIUS)
  const [x2, y2] = polar(endDeg, RADIUS)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2} ${y2} Z`
}

// Position a square image centred within a wedge, rotated to face outward and
// upright at the segment's mid-angle. Sized to cover the outer part of the wedge.
function imageTransform(midDeg: number): string {
  const [cx, cy] = polar(midDeg, RADIUS * 0.6)
  return `translate(${cx} ${cy}) rotate(${midDeg})`
}

// Image box (in the rotated local frame, centred at origin).
const imgBox = computed(() => {
  const n = props.memes.length || 1
  // Larger images when fewer segments; clamp to a sensible range.
  const size = Math.min(RADIUS * 0.8, Math.max(RADIUS * 0.35, (2 * Math.PI * RADIUS * 0.6) / n))
  return { size, offset: -size / 2 }
})

function spin(): void {
  if (spinning.value || props.disabled || props.memes.length === 0) return

  const n = props.memes.length
  const winnerIndex = randomIndex(n)
  const step = 360 / n

  // Pointer sits at 0deg (top). Segment i centre is at (i + 0.5) * step.
  // Rotate so the winning centre aligns with the pointer, plus several turns.
  const segmentCentre = (winnerIndex + 0.5) * step
  const current = rotation.value
  const currentMod = ((current % 360) + 360) % 360
  const target = 360 - segmentCentre
  let delta = target - currentMod
  if (delta < 0) delta += 360
  const fullTurns = 5
  rotation.value = current + fullTurns * 360 + delta

  spinning.value = true
  emit('spinning', true)

  const winner = props.memes[winnerIndex]
  const onEnd = () => {
    spinning.value = false
    emit('spinning', false)
    emit('result', winner)
  }
  // Fallback in case transitionend does not fire.
  window.setTimeout(onEnd, 4200)
}

const wheelStyle = computed(() => ({
  transform: `rotate(${rotation.value}deg)`,
}))

defineExpose({ spin })
</script>

<template>
  <div class="wheel-wrap">
    <div class="wheel-stage">
      <div class="pointer" aria-hidden="true"></div>
      <svg
        class="wheel"
        :class="{ spinning }"
        :viewBox="`0 0 ${SIZE} ${SIZE}`"
        :style="wheelStyle"
        role="img"
        aria-label="Meme roulette wheel"
      >
        <defs>
          <clipPath v-for="(seg, i) in segments" :id="seg.clipId" :key="i">
            <path :d="seg.path" />
          </clipPath>
        </defs>

        <g v-if="segments.length">
          <g v-for="(seg, i) in segments" :key="i">
            <path :d="seg.path" :fill="seg.color" stroke="#1b1b2f" stroke-width="1.5" />
            <g :clip-path="`url(#${seg.clipId})`">
              <image
                :href="seg.meme.url"
                :transform="seg.imgTransform"
                :x="imgBox.offset"
                :y="imgBox.offset"
                :width="imgBox.size"
                :height="imgBox.size"
                preserveAspectRatio="xMidYMid slice"
              />
            </g>
            <path
              :d="seg.path"
              fill="none"
              stroke="#1b1b2f"
              stroke-width="1.5"
              pointer-events="none"
            />
          </g>
        </g>
        <circle v-else :cx="CENTER" :cy="CENTER" :r="RADIUS - 2" fill="#2a2a40" />

        <circle
          :cx="CENTER"
          :cy="CENTER"
          r="34"
          fill="#1b1b2f"
          stroke="#fff"
          stroke-width="3"
        />
      </svg>
    </div>

    <button
      type="button"
      class="spin-btn"
      :disabled="disabled || spinning || memes.length === 0"
      @click="spin"
    >
      {{ spinning ? 'Spinning…' : 'Spin!' }}
    </button>
  </div>
</template>

<style scoped>
.wheel-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  width: 100%;
}

.wheel-stage {
  position: relative;
  width: 100%;
  max-width: min(80vh, 100%);
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pointer {
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 20px solid transparent;
  border-right: 20px solid transparent;
  border-top: 34px solid #fff;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
  z-index: 2;
}

.wheel {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  transition: transform 4s cubic-bezier(0.16, 1, 0.3, 1);
  background: #2a2a40;
}

.spin-btn {
  font-size: 1.25rem;
  font-weight: 700;
  padding: 0.85rem 3rem;
  border: none;
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(135deg, #8338ec, #3a86ff);
  cursor: pointer;
  transition: transform 0.1s ease, opacity 0.2s ease;
}

.spin-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.spin-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
