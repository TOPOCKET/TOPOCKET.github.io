import { quickLinkListSchema } from '../data/schemas'
import { defaultQuickLinks } from '../data/links'
import type { QuickLinkItem } from '../types/link'
import { loadRecord, saveRecord } from '../storage/record'
import { storageKeys } from '../storage/keys'

const defaults: QuickLinkItem[] = [...defaultQuickLinks]

const migrate = (): QuickLinkItem[] | null => null

const load = (): QuickLinkItem[] => {
  const fromV1 = loadRecord(storageKeys.linksV1, quickLinkListSchema, defaults)
  return migrate() ?? fromV1
}

const save = (value: QuickLinkItem[]) => {
  saveRecord(storageKeys.linksV1, quickLinkListSchema.parse(value))
}

const reset = (): QuickLinkItem[] => {
  save(defaults)
  return [...defaults]
}

export const linksStore = {
  load,
  save,
  reset,
  migrate,
  defaults,
}
