/**
 * Pure, deterministic-friendly picking helpers.
 *
 * The wheel animation is purely visual: the actual winner is chosen here so the
 * result logic stays independent of animation timing and is easy to unit test.
 * `rng` defaults to `Math.random` but can be injected for deterministic tests.
 */

export type Rng = () => number

/** Pick a random element from a non-empty array. */
export function pickRandom<T>(items: readonly T[], rng: Rng = Math.random): T {
  if (items.length === 0) {
    throw new Error('pickRandom: cannot pick from an empty array')
  }
  return items[randomIndex(items.length, rng)]
}

/** Return a random index in the range [0, length). */
export function randomIndex(length: number, rng: Rng = Math.random): number {
  if (length <= 0) {
    throw new Error('randomIndex: length must be greater than 0')
  }
  return Math.floor(rng() * length)
}

/**
 * Return a new array shuffled with the Fisher-Yates algorithm.
 * Does not mutate the input.
 */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const result = items.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
