/**
 * @file zhushenCustomStore 文件说明。
 * @description 按业务域封装本地持久化状态读写接口。
 */
import { z } from 'zod'
import type { EquipDef, JobDef, SkillDef, TraitDef } from '../features/zhushen-model'
import {
  zhushenEquipListSchema,
  zhushenJobListSchema,
  zhushenSkillListSchema,
  zhushenTraitListSchema,
} from '../features/zhushen-model'
import { storageKeys } from '../storage/keys'
import { loadRecord, saveRecord } from '../storage/record'
import type { StoreContract } from './store-contract'

const zhushenCustomSchema = z.object({
  jobs: zhushenJobListSchema,
  equips: zhushenEquipListSchema,
  skills: zhushenSkillListSchema,
  traits: zhushenTraitListSchema,
})

/**
 * ZhushenCustomState 接口定义。
 * @remarks 该接口用于跨模块数据交换，字段变更需同步校验层与持久化层。
 */
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

const load = (): ZhushenCustomState => {
  return loadRecord(storageKeys.zhushenCustomV1, zhushenCustomSchema, defaults)
}

const save = (value: ZhushenCustomState) => {
  saveRecord(storageKeys.zhushenCustomV1, zhushenCustomSchema.parse(value))
}

const reset = (): ZhushenCustomState => {
  save(defaults)
  return defaults
}

/**
 * zhushenCustomStore 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const zhushenCustomStore = {
  load,
  save,
  reset,
  defaults,
} satisfies StoreContract<ZhushenCustomState> & { defaults: ZhushenCustomState }
