import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'

const VIRTUAL_ID = 'virtual:local-memes'
const RESOLVED_ID = '\0' + VIRTUAL_ID

const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.svg',
])

export interface LocalCategory {
  slug: string
  name: string
  count: number
}

export interface LocalMeme {
  /** `<category>/<filename-without-ext>` */
  id: string
  name: string
  /** Path relative to `public/memes/`, e.g. `reaction/drake.jpg`. */
  file: string
}

export interface LocalRegistry {
  categories: LocalCategory[]
  memes: Record<string, LocalMeme[]>
}

/** Turn a slug-ish string (`kebab`/`snake_case`) into `Title Case`. */
function prettify(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function extname(file: string): string {
  const dot = file.lastIndexOf('.')
  return dot === -1 ? '' : file.slice(dot).toLowerCase()
}

function stripExt(file: string): string {
  const dot = file.lastIndexOf('.')
  return dot === -1 ? file : file.slice(0, dot)
}

/**
 * Scan `<memesDir>/<category>/<image>` and build the local meme registry.
 * Pure and synchronous so it can be unit-tested without a Vite server.
 */
export function buildRegistry(memesDir: string): LocalRegistry {
  const registry: LocalRegistry = { categories: [], memes: {} }
  if (!existsSync(memesDir) || !statSync(memesDir).isDirectory()) {
    return registry
  }

  const categoryDirs = readdirSync(memesDir)
    .filter((entry) => !entry.startsWith('.'))
    .filter((entry) => statSync(join(memesDir, entry)).isDirectory())
    .sort()

  for (const slug of categoryDirs) {
    const files = readdirSync(join(memesDir, slug))
      .filter((file) => !file.startsWith('.'))
      .filter((file) => IMAGE_EXTENSIONS.has(extname(file)))
      .filter((file) => statSync(join(memesDir, slug, file)).isFile())
      .sort()

    const memes: LocalMeme[] = files.map((file) => ({
      id: `${slug}/${stripExt(file)}`,
      name: prettify(stripExt(file)),
      file: `${slug}/${file}`,
    }))

    registry.memes[slug] = memes
    registry.categories.push({ slug, name: prettify(slug), count: memes.length })
  }

  return registry
}

/**
 * Vite plugin exposing the local meme registry as the virtual module
 * `virtual:local-memes`. Images are served from `public/memes/<category>/`.
 */
export function localMemes(): Plugin {
  let memesDir = ''

  function load(): string {
    const registry = buildRegistry(memesDir)
    return `export const registry = ${JSON.stringify(registry)}\n`
  }

  return {
    name: 'local-memes',

    configResolved(config) {
      memesDir = join(config.root, 'public', 'memes')
    },

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },

    load(id) {
      if (id === RESOLVED_ID) return load()
    },

    configureServer(server: ViteDevServer) {
      const invalidate = () => {
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.add(memesDir)
      server.watcher.on('add', invalidate)
      server.watcher.on('unlink', invalidate)
      server.watcher.on('addDir', invalidate)
      server.watcher.on('unlinkDir', invalidate)
    },
  }
}
