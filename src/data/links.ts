/**
 * @file links 文件说明。
 * @description 静态业务数据与数据结构校验定义。
 */
import type { QuickLinkItem } from '../types/link'
import { parseOrThrow, quickLinkListSchema } from './schemas'

/**
 * defaultQuickLinks 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
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
    id: 'hongxingdl',
    name: '红杏云',
    url: 'https://hongxingdl.com',
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

/**
 * quickLinks 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const quickLinks = parseOrThrow('quickLinks', quickLinkListSchema, defaultQuickLinks)
