/**
 * @file linksStore 文件说明。
 * @description 按业务域封装本地持久化状态读写接口。
 */
import { quickLinkListSchema } from '../data/schemas'
import { defaultQuickLinks } from '../data/links'
import type { QuickLinkItem } from '../types/link'
import { loadRecord, saveRecord } from '../storage/record'
import { storageKeys } from '../storage/keys'
import type { StoreContract } from './store-contract'

const defaults: QuickLinkItem[] = [...defaultQuickLinks]

const load = (): QuickLinkItem[] => {
  return loadRecord(storageKeys.linksV1, quickLinkListSchema, defaults)
}

const save = (value: QuickLinkItem[]) => {
  saveRecord(storageKeys.linksV1, quickLinkListSchema.parse(value))
}

const reset = (): QuickLinkItem[] => {
  save(defaults)
  return [...defaults]
}

/**
 * linksStore 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const linksStore = {
  load,
  save,
  reset,
  defaults,
} satisfies StoreContract<QuickLinkItem[], QuickLinkItem[], QuickLinkItem[]> & { defaults: QuickLinkItem[] }
