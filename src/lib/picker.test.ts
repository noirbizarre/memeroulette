import { describe, expect, it } from 'vitest'
import { pickRandom, randomIndex, shuffle, type Rng } from './picker'

/** Deterministic rng cycling through the provided values. */
function seededRng(values: number[]): Rng {
  let i = 0
  return () => values[i++ % values.length]
}

describe('randomIndex', () => {
  it('maps rng output to an in-range index', () => {
    expect(randomIndex(4, () => 0)).toBe(0)
    expect(randomIndex(4, () => 0.99)).toBe(3)
    expect(randomIndex(4, () => 0.5)).toBe(2)
  })

  it('throws on non-positive length', () => {
    expect(() => randomIndex(0)).toThrow()
    expect(() => randomIndex(-1)).toThrow()
  })
})

describe('pickRandom', () => {
  const items = ['a', 'b', 'c', 'd']

  it('picks the element at the rng-derived index', () => {
    expect(pickRandom(items, () => 0)).toBe('a')
    expect(pickRandom(items, () => 0.99)).toBe('d')
  })

  it('always returns a member of the array', () => {
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(pickRandom(items))
    }
  })

  it('throws on an empty array', () => {
    expect(() => pickRandom([])).toThrow()
  })
})

describe('shuffle', () => {
  it('does not mutate the input', () => {
    const input = [1, 2, 3, 4]
    const copy = [...input]
    shuffle(input)
    expect(input).toEqual(copy)
  })

  it('preserves all elements', () => {
    const input = [1, 2, 3, 4, 5]
    const out = shuffle(input, seededRng([0.1, 0.7, 0.3, 0.9, 0.2]))
    expect([...out].sort((a, b) => a - b)).toEqual(input)
  })

  it('is deterministic for a given rng', () => {
    const input = [1, 2, 3, 4, 5]
    const seq = [0.1, 0.7, 0.3, 0.9, 0.2]
    expect(shuffle(input, seededRng(seq))).toEqual(shuffle(input, seededRng(seq)))
  })
})
