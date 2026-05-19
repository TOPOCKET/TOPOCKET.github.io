import { z } from 'zod'
import type { EquipDef, JobDef, SkillDef, TraitDef } from '../features/zhushen-simulator'
import {
  zhushenEquipListSchema,
  zhushenJobListSchema,
  zhushenSkillListSchema,
  zhushenTraitListSchema,
} from '../features/zhushen-simulator'
import { storageKeys } from '../storage/keys'
import { loadRecord, saveRecord } from '../storage/record'

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

const migrate = (): ZhushenCustomState | null => null

const load = (): ZhushenCustomState => {
  const fromV1 = loadRecord(storageKeys.zhushenCustomV1, zhushenCustomSchema, defaults)
  return migrate() ?? fromV1
}

const save = (value: ZhushenCustomState) => {
  saveRecord(storageKeys.zhushenCustomV1, zhushenCustomSchema.parse(value))
}

const reset = (): ZhushenCustomState => {
  save(defaults)
  return defaults
}

export const zhushenCustomStore = {
  load,
  save,
  reset,
  migrate,
  defaults,
}
