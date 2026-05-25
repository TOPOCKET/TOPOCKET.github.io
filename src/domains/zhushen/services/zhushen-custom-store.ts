import { z } from 'zod'
import type { EquipDef, JobDef, SkillDef, TraitDef } from '@/domains/zhushen/model/zhushen-model'
import {
  zhushenEquipListSchema,
  zhushenJobListSchema,
  zhushenSkillListSchema,
  zhushenTraitListSchema,
} from '@/domains/zhushen/model/zhushen-model'
import { loadRecord, saveRecord, storageKeys, type StoreContract } from '@/shared/persistence'

const zhushenCustomSchema = z.object({
  jobs: zhushenJobListSchema,
  equips: zhushenEquipListSchema,
  skills: zhushenSkillListSchema,
  traits: zhushenTraitListSchema,
})

export interface ZhushenCustomState {
  jobs: JobDef[]
  equips: EquipDef[]
  skills: SkillDef[]
  traits: TraitDef[]
}

const defaults: ZhushenCustomState = {
  jobs: [],
  equips: [],
  skills: [],
  traits: [],
}

const load = (): ZhushenCustomState => loadRecord(storageKeys.zhushenCustomV1, zhushenCustomSchema, defaults)
const save = (value: ZhushenCustomState) => saveRecord(storageKeys.zhushenCustomV1, zhushenCustomSchema.parse(value))
const reset = (): ZhushenCustomState => {
  save(defaults)
  return defaults
}

export const zhushenCustomStore = {
  load,
  save,
  reset,
  defaults,
} satisfies StoreContract<ZhushenCustomState> & { defaults: ZhushenCustomState }
