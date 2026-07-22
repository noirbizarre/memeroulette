import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildRegistry } from './local-memes'

let root = ''
let memesDir = ''

function writeFile(relative: string, contents = ''): void {
  const abs = join(memesDir, relative)
  mkdirSync(join(abs, '..'), { recursive: true })
  writeFileSync(abs, contents)
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'local-memes-'))
  memesDir = join(root, 'memes')
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('buildRegistry', () => {
  it('returns an empty registry when the directory is missing', () => {
    expect(buildRegistry(join(root, 'does-not-exist'))).toEqual({
      categories: [],
      memes: {},
    })
  })

  it('derives categories from directories with prettified names and counts', () => {
    writeFile('reaction/drake-hotline-bling.jpg')
    writeFile('reaction/distracted_boyfriend.png')
    writeFile('animal_pics/grumpy-cat.gif')

    const registry = buildRegistry(memesDir)

    expect(registry.categories).toEqual([
      { slug: 'animal_pics', name: 'Animal Pics', count: 1 },
      { slug: 'reaction', name: 'Reaction', count: 2 },
    ])
  })

  it('derives memes per category with id, name and relative file path', () => {
    writeFile('reaction/drake-hotline-bling.jpg')

    const registry = buildRegistry(memesDir)

    expect(registry.memes.reaction).toEqual([
      {
        id: 'reaction/drake-hotline-bling',
        name: 'Drake Hotline Bling',
        file: 'reaction/drake-hotline-bling.jpg',
      },
    ])
  })

  it('ignores non-image files and dotfiles', () => {
    writeFile('reaction/valid.png')
    writeFile('reaction/notes.txt')
    writeFile('reaction/.hidden.png')

    const registry = buildRegistry(memesDir)

    expect(registry.memes.reaction.map((m) => m.file)).toEqual(['reaction/valid.png'])
    expect(registry.categories[0].count).toBe(1)
  })

  it('ignores hidden directories and files that are not directories', () => {
    writeFile('.git/config')
    writeFile('reaction/one.png')

    const registry = buildRegistry(memesDir)

    expect(registry.categories.map((c) => c.slug)).toEqual(['reaction'])
  })

  it('supports all recognised image extensions', () => {
    for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg']) {
      writeFile(`ext/file.${ext}`)
    }

    const registry = buildRegistry(memesDir)

    expect(registry.memes.ext).toHaveLength(7)
  })
})
