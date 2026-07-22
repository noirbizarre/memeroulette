import type { MemeProvider } from '../types'
import { localProvider } from './local'
import { justMemeProvider } from './justmeme'

/**
 * Registry of available meme providers. Add a new provider by implementing
 * `MemeProvider` and appending it here. The local provider is listed first so
 * it is the default (offline-friendly) provider.
 */
export const providers: MemeProvider[] = [localProvider, justMemeProvider]

export function getProvider(id: string): MemeProvider | undefined {
  return providers.find((p) => p.id === id)
}
