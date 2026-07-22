declare module 'virtual:local-memes' {
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

  export const registry: {
    categories: LocalCategory[]
    memes: Record<string, LocalMeme[]>
  }
}
