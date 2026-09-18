/** 无限战棋本地存档读写与领域边界校验。 */
import { loadRecord, saveRecord, storageKeys, type StoreContract } from '@/shared/persistence'
import { createRuntimeSchema } from '@/shared/validation/schema'
import type { TacticsActionLimits, TacticsBattle, TacticsHero, TacticsSave, TacticsStats, TacticsUnit } from '../model/tactics-model'
import { createInitialTacticsSave } from '../engine/tactics-engine'

export const tacticsSaveLimits = { maxStage: 100_000, maxSupplies: 1_000_000, maxHeroes: 12, maxBoardSize: 50, maxUnits: 24, maxLogEntries: 32, maxStat: 9_999 } as const

const isRecord = (data: unknown): data is Record<string, unknown> => typeof data === 'object' && data !== null && !Array.isArray(data)
const recordValue = (data: unknown, label: string): Record<string, unknown> => {
  if (!isRecord(data)) throw new Error(`${label} must be an object`)
  return data
}
const integer = (data: unknown, label: string, min: number, max: number): number => {
  if (typeof data !== 'number' || !Number.isInteger(data) || data < min || data > max) throw new Error(`${label} must be an integer from ${min} to ${max}`)
  return data
}
const text = (data: unknown, label: string, maxLength: number): string => {
  if (typeof data !== 'string' || data.length === 0 || data.length > maxLength) throw new Error(`${label} is invalid`)
  return data
}
const unique = (label: string, values: readonly string[]) => {
  if (new Set(values).size !== values.length) throw new Error(`${label} must be unique`)
}

const parseStats = (data: unknown): TacticsStats => {
  const record = recordValue(data, 'stats')
  return {
    maxHp: integer(record.maxHp, 'stats.maxHp', 1, tacticsSaveLimits.maxStat),
    atk: integer(record.atk, 'stats.atk', 1, tacticsSaveLimits.maxStat),
    def: integer(record.def, 'stats.def', 0, tacticsSaveLimits.maxStat),
    move: integer(record.move, 'stats.move', 1, tacticsSaveLimits.maxBoardSize),
    range: integer(record.range, 'stats.range', 1, tacticsSaveLimits.maxBoardSize),
    actions: parseActions(record.actions),
  }
}
const parseActions = (data: unknown): TacticsActionLimits => {
  const record = recordValue(data, 'stats.actions')
  return { move: integer(record.move, 'stats.actions.move', 0, 9), attack: integer(record.attack, 'stats.actions.attack', 0, 9) }
}
const parseAttributes = (data: unknown, stats: TacticsStats) => { const fallback = { strength: stats.atk, technique: 0, agility: 0, constitution: Math.max(1, Math.floor(stats.maxHp / 3)), perception: 0, willpower: 0 }; if (!isRecord(data)) return fallback; return { strength: integer(data.strength, 'attributes.strength', 0, tacticsSaveLimits.maxStat), technique: integer(data.technique, 'attributes.technique', 0, tacticsSaveLimits.maxStat), agility: integer(data.agility, 'attributes.agility', 0, tacticsSaveLimits.maxStat), constitution: integer(data.constitution, 'attributes.constitution', 0, tacticsSaveLimits.maxStat), perception: integer(data.perception, 'attributes.perception', 0, tacticsSaveLimits.maxStat), willpower: integer(data.willpower, 'attributes.willpower', 0, tacticsSaveLimits.maxStat) } }
const parseHero = (data: unknown): TacticsHero => {
  const record = recordValue(data, 'hero')
  const professionId = text(record.professionId, 'hero.professionId', 32)
  if (!Array.isArray(record.learnedSkillIds) || !record.learnedSkillIds.every((id) => typeof id === 'string') || (record.skillDraft !== null && (!Array.isArray(record.skillDraft) || !record.skillDraft.every((id) => typeof id === 'string')))) throw new Error('hero skills are invalid')
  const learnedSkillIds = record.learnedSkillIds as string[]; const storedCore = record.equippedCoreSkillId === undefined ? null : record.equippedCoreSkillId === null ? null : text(record.equippedCoreSkillId, 'hero.equippedCoreSkillId', 64); const equippedCoreSkillId = storedCore && learnedSkillIds.includes(storedCore) ? storedCore : learnedSkillIds.find((id) => id === 'strike') ?? null; const equippedTacticalSkillIds = (Array.isArray(record.equippedTacticalSkillIds) ? record.equippedTacticalSkillIds : learnedSkillIds.filter((id) => id === 'bleeding-edge')).filter((id): id is string => typeof id === 'string' && learnedSkillIds.includes(id)).slice(0, 3)
  const stats = parseStats(record.stats); return { id: text(record.id, 'hero.id', 64), name: text(record.name, 'hero.name', 8), color: text(record.color, 'hero.color', 32), level: integer(record.level, 'hero.level', 1, tacticsSaveLimits.maxStage), xp: integer(record.xp, 'hero.xp', 0, tacticsSaveLimits.maxSupplies), training: integer(record.training, 'hero.training', 0, tacticsSaveLimits.maxSupplies), stats, attributes: parseAttributes(record.attributes, stats), professionId, learnedSkillIds, equippedCoreSkillId, equippedTacticalSkillIds, skillDraft: record.skillDraft }
}
const optionalInteger = (data: unknown, label: string, min: number, max: number): number | undefined => data === undefined ? undefined : integer(data, label, min, max)
const parseEnergy = (data: unknown) => {
  if (data === undefined) return undefined
  const record = recordValue(data, 'unit.energy')
  const max = integer(record.max, 'unit.energy.max', 1, 99)
  return { current: integer(record.current, 'unit.energy.current', 0, max), max, regen: integer(record.regen, 'unit.energy.regen', 0, 99), name: text(record.name, 'unit.energy.name', 16), color: text(record.color, 'unit.energy.color', 32) }
}
const parseCombat = (data: unknown) => {
  if (data === undefined) return undefined
  const record = recordValue(data, 'unit.combat')
  const shieldMax = integer(record.shieldMax, 'unit.combat.shieldMax', 0, tacticsSaveLimits.maxStat)
  const immunityMax = integer(record.immunityMax, 'unit.combat.immunityMax', 0, 9)
  return { shield: integer(record.shield, 'unit.combat.shield', 0, shieldMax), shieldMax, immunity: integer(record.immunity, 'unit.combat.immunity', 0, immunityMax), immunityMax, evasion: integer(record.evasion, 'unit.combat.evasion', 0, 100), reduction: integer(record.reduction, 'unit.combat.reduction', 0, tacticsSaveLimits.maxStat), regeneration: integer(record.regeneration, 'unit.combat.regeneration', 0, tacticsSaveLimits.maxStat), lifesteal: integer(record.lifesteal, 'unit.combat.lifesteal', 0, 100) }
}
const parseUnit = (data: unknown, width: number, height: number): TacticsUnit => {
  const record = recordValue(data, 'unit')
  const stats = parseStats(record.stats)
  const side = record.side === 'player' || record.side === 'enemy' ? record.side : null
  if (!side || (record.heroId !== undefined && typeof record.heroId !== 'string')) throw new Error('unit state is invalid')
  const moved = integer(record.moved, 'unit.moved', 0, stats.actions.move)
  const attacked = integer(record.attacked, 'unit.attacked', 0, stats.actions.attack)
  const professionId = record.professionId === undefined ? undefined : text(record.professionId, 'unit.professionId', 32)
  if (record.learnedSkillIds !== undefined && (!Array.isArray(record.learnedSkillIds) || !record.learnedSkillIds.every((id) => typeof id === 'string'))) throw new Error('unit.learnedSkillIds is invalid')
  const learnedSkillIds = record.learnedSkillIds as string[] | undefined
  const counterTiming = record.counterTiming === undefined ? undefined : record.counterTiming === 'before' || record.counterTiming === 'after' ? record.counterTiming : (() => { throw new Error('unit.counterTiming is invalid') })()
  return { id: text(record.id, 'unit.id', 64), side, heroId: record.heroId, name: text(record.name, 'unit.name', 32), color: text(record.color, 'unit.color', 32), x: integer(record.x, 'unit.x', 0, width - 1), y: integer(record.y, 'unit.y', 0, height - 1), hp: integer(record.hp, 'unit.hp', 0, stats.maxHp), stats, moved, attacked, professionId, learnedSkillIds, bonusMove: optionalInteger(record.bonusMove, 'unit.bonusMove', 0, tacticsSaveLimits.maxBoardSize), attackCooldown: optionalInteger(record.attackCooldown, 'unit.attackCooldown', 0, 9), energy: parseEnergy(record.energy), combat: parseCombat(record.combat), damageOverTime: optionalInteger(record.damageOverTime, 'unit.damageOverTime', 0, tacticsSaveLimits.maxStat), damageOverTimeTurns: optionalInteger(record.damageOverTimeTurns, 'unit.damageOverTimeTurns', 0, 9), counterTiming }
}
const parseBattle = (data: unknown, heroIds: ReadonlySet<string>): TacticsBattle | null => {
  if (data === null) return null
  const record = recordValue(data, 'battle')
  const width = integer(record.width, 'battle.width', 4, tacticsSaveLimits.maxBoardSize)
  const height = integer(record.height, 'battle.height', 4, tacticsSaveLimits.maxBoardSize)
  if (!Array.isArray(record.units) || record.units.length === 0 || record.units.length > tacticsSaveLimits.maxUnits) throw new Error('battle.units is invalid')
  const units = record.units.map((unit) => parseUnit(unit, width, height))
  unique('unit.id', units.map((unit) => unit.id))
  unique('living unit position', units.filter((unit) => unit.hp > 0).map((unit) => `${unit.x},${unit.y}`))
  for (const unit of units) {
    if (unit.side === 'player' && (!unit.heroId || !heroIds.has(unit.heroId))) throw new Error('player unit must reference a hero')
    if (unit.side === 'enemy' && unit.heroId !== undefined) throw new Error('enemy unit must not reference a hero')
  }
  if (!Array.isArray(record.log) || record.log.length > tacticsSaveLimits.maxLogEntries) throw new Error('battle.log is invalid')
  const status = record.status === 'ready' || record.status === 'fighting' || record.status === 'victory' || record.status === 'defeat' ? record.status : null
  const turn = record.turn === 'player' || record.turn === 'enemy' ? record.turn : null
  const selectedUnitId = record.selectedUnitId === null ? null : text(record.selectedUnitId, 'battle.selectedUnitId', 64)
  if (!status || !turn || (selectedUnitId && !units.some((unit) => unit.id === selectedUnitId && unit.side === 'player' && unit.hp > 0))) throw new Error('battle state is invalid')
  return { id: text(record.id, 'battle.id', 64), stage: integer(record.stage, 'battle.stage', 1, tacticsSaveLimits.maxStage), width, height, turn, round: integer(record.round, 'battle.round', 1, tacticsSaveLimits.maxStage), status, selectedUnitId, units, log: record.log.map((entry) => text(entry, 'battle.log entry', 240)) }
}

const migrateV1 = (data: Record<string, unknown>): Record<string, unknown> => ({
  ...data,
  version: 2,
  heroes: Array.isArray(data.heroes) ? data.heroes.map((hero) => isRecord(hero) ? { ...hero, stats: isRecord(hero.stats) ? { ...hero.stats, actions: { move: 1, attack: 1 } } : hero.stats } : hero) : data.heroes,
  battle: isRecord(data.battle) ? { ...data.battle, units: Array.isArray(data.battle.units) ? data.battle.units.map((unit) => isRecord(unit) ? { ...unit, moved: unit.acted === true ? 1 : 0, attacked: unit.acted === true ? 1 : 0, stats: isRecord(unit.stats) ? { ...unit.stats, actions: { move: 1, attack: 1 } } : unit.stats } : unit) : data.battle.units } : data.battle,
})
const migrateV2 = (data: Record<string, unknown>): Record<string, unknown> => ({ ...data, version: 3, heroes: Array.isArray(data.heroes) ? data.heroes.map((hero, index) => isRecord(hero) ? { ...hero, professionId: index === 0 ? 'vanguard' : index === 1 ? 'ranger' : 'adept', learnedSkillIds: [], skillDraft: null } : hero) : data.heroes })
const migrateV3 = (data: Record<string, unknown>): Record<string, unknown> => ({ ...data, version: 4, heroes: Array.isArray(data.heroes) ? data.heroes.map((hero, index) => isRecord(hero) ? { ...hero, professionId: index === 0 ? 'assassin' : index === 1 ? 'raider-cavalry' : index === 2 ? 'crossbowman' : 'adept', learnedSkillIds: Array.isArray(hero.learnedSkillIds) && hero.learnedSkillIds.length ? hero.learnedSkillIds : ['strike'] } : hero) : data.heroes })
const migrateV4 = (data: Record<string, unknown>): Record<string, unknown> => {
  const heroes = Array.isArray(data.heroes) ? data.heroes : []
  const byId = new Map(heroes.filter(isRecord).map((hero) => [hero.id, hero]))
  return { ...data, version: 5, battle: isRecord(data.battle) && Array.isArray(data.battle.units) ? { ...data.battle, units: data.battle.units.map((unit) => { const hero = isRecord(unit) ? byId.get(unit.heroId) : undefined; return isRecord(unit) && isRecord(hero) ? { ...unit, professionId: hero.professionId, learnedSkillIds: hero.learnedSkillIds } : unit }) } : data.battle }
}
const migrateV5 = (data: Record<string, unknown>): Record<string, unknown> => ({ ...migrateV4({ ...data, version: 4 }), version: 6 })

export const tacticsSaveSchema = createRuntimeSchema<TacticsSave>((data) => {
  const record = recordValue(data, 'tactics save')
  const current = record.version === 1 ? migrateV5(migrateV4(migrateV3(migrateV2(migrateV1(record))))) : record.version === 2 ? migrateV5(migrateV4(migrateV3(migrateV2(record)))) : record.version === 3 ? migrateV5(migrateV4(migrateV3(record))) : record.version === 4 ? migrateV5(migrateV4(record)) : record.version === 5 ? migrateV5(record) : record
  if (current.version !== 6 && current.version !== 7) throw new Error('tactics save version is unsupported')
  const stage = integer(current.stage, 'save.stage', 1, tacticsSaveLimits.maxStage)
  if (!Array.isArray(current.heroes) || current.heroes.length === 0 || current.heroes.length > tacticsSaveLimits.maxHeroes) throw new Error('save.heroes is invalid')
  const heroes = current.heroes.map(parseHero)
  unique('hero.id', heroes.map((hero) => hero.id))
  const battle = parseBattle(current.battle, new Set(heroes.map((hero) => hero.id)))
  if (battle && battle.stage !== stage) throw new Error('battle.stage must equal save.stage')
  return { version: 7, stage, supplies: integer(current.supplies, 'save.supplies', 0, tacticsSaveLimits.maxSupplies), heroes, battle }
})

const load = (): TacticsSave => loadRecord(storageKeys.tacticsV1, tacticsSaveSchema, createInitialTacticsSave)
const save = (value: TacticsSave) => saveRecord(storageKeys.tacticsV1, tacticsSaveSchema.parse(value))
const reset = (): TacticsSave => { const next = createInitialTacticsSave(); save(next); return next }
export const tacticsStore = { load, save, reset } satisfies StoreContract<TacticsSave>
