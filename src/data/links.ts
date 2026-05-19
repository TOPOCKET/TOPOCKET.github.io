import type { QuickLinkItem } from '../types/link'
import { parseOrThrow, quickLinkListSchema } from './schemas'

export const defaultQuickLinks: QuickLinkItem[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
    category: 'ai',
    favorite: true,
  },
  {
    id: 'github',
    name: 'GitHub',
    url: 'https://github.com/',
    category: 'dev',
    favorite: true,
  },
  {
    id: 'fatcat',
    name: 'fatcat',
    url: 'https://fccfweb20231204.fatcatcf.com/dashboard',
    category: 'dev',
    favorite: true,
  },
  {
    id: 'google-photos',
    name: 'Google Photos',
    url: 'https://photos.google.com/',
    category: 'media',
    favorite: true,
  },
]

export const quickLinks = parseOrThrow('quickLinks', quickLinkListSchema, defaultQuickLinks)
