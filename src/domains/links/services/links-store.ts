import { quickLinkListSchema } from '@/data/schemas'
import { defaultQuickLinks } from '@/data/links'
import type { QuickLinkItem } from '@/types/link'
import { loadRecord, saveRecord, storageKeys, type StoreContract } from '@/shared/persistence'

const defaults: QuickLinkItem[] = [...defaultQuickLinks]

const load = (): QuickLinkItem[] => loadRecord(storageKeys.linksV1, quickLinkListSchema, defaults)
const save = (value: QuickLinkItem[]) => saveRecord(storageKeys.linksV1, quickLinkListSchema.parse(value))
const reset = (): QuickLinkItem[] => {
  save(defaults)
  return [...defaults]
}

export const linksStore = {
  load,
  save,
  reset,
  defaults,
} satisfies StoreContract<QuickLinkItem[], QuickLinkItem[], QuickLinkItem[]> & { defaults: QuickLinkItem[] }
