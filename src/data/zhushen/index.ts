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
} from '../../features/zhushen-simulator'

export const builtinZhushenJobs: JobDef[] = parseOrThrow('zhushen.jobs', zhushenJobListSchema, jobsRaw)
export const builtinZhushenEquips: EquipDef[] = parseOrThrow('zhushen.equips', zhushenEquipListSchema, equipsRaw)
export const builtinZhushenSkills: SkillDef[] = parseOrThrow('zhushen.skills', zhushenSkillListSchema, skillsRaw)
export const builtinZhushenTraits: TraitDef[] = parseOrThrow('zhushen.traits', zhushenTraitListSchema, traitsRaw)
