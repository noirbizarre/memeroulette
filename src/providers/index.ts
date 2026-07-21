import type { MemeProvider } from '../types'
import { justMemeProvider } from './justmeme'

/**
 * Registry of available meme providers. Add a new provider by implementing
 * `MemeProvider` and appending it here.
 */
export const providers: MemeProvider[] = [justMemeProvider]

export function getProvider(id: string): MemeProvider | undefined {
  return providers.find((p) => p.id === id)
}
