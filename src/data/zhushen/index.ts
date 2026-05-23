/**
 * @file index 文件说明。
 * @description 静态业务数据与数据结构校验定义。
 */
import jobsRaw from './jobs.json'
import equipsRaw from './equips.json'
import skillsRaw from './skills.json'
import traitsRaw from './traits.json'
import { parseOrThrow } from '../schemas'
import {
  zhushenEquipListSchema,
  zhushenJobListSchema,
  zhushenSkillListSchema,
  zhushenTraitListSchema,
  type EquipDef,
  type JobDef,
  type SkillDef,
  type TraitDef,
} from '../../features/zhushen-model'

/**
 * builtinZhushenJobs 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const builtinZhushenJobs: JobDef[] = parseOrThrow('zhushen.jobs', zhushenJobListSchema, jobsRaw)

/**
 * builtinZhushenEquips 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const builtinZhushenEquips: EquipDef[] = parseOrThrow('zhushen.equips', zhushenEquipListSchema, equipsRaw)

/**
 * builtinZhushenSkills 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const builtinZhushenSkills: SkillDef[] = parseOrThrow('zhushen.skills', zhushenSkillListSchema, skillsRaw)

/**
 * builtinZhushenTraits 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const builtinZhushenTraits: TraitDef[] = parseOrThrow('zhushen.traits', zhushenTraitListSchema, traitsRaw)
