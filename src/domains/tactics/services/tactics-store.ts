/** 无限战棋本地存档读写与领域边界校验。 */
import { loadRecord, saveRecord, storageKeys, type StoreContract } from '@/shared/persistence'
import { createRuntimeSchema } from '@/shared/validation/schema'
import type { TacticsBattle, TacticsHero, TacticsSave, TacticsStats, TacticsUnit } from '../model/tactics-model'
import { createInitialTacticsSave } from '../engine/tactics-engine'

export const tacticsSaveLimits = { maxStage: 100_000, maxSupplies: 1_000_000, maxHeroes: 12, maxBoardSize: 12, maxUnits: 24, maxLogEntries: 32, maxStat: 9_999 } as const

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
  }
}
const parseHero = (data: unknown): TacticsHero => {
  const record = recordValue(data, 'hero')
  return { id: text(record.id, 'hero.id', 64), name: text(record.name, 'hero.name', 8), color: text(record.color, 'hero.color', 32), level: integer(record.level, 'hero.level', 1, tacticsSaveLimits.maxStage), xp: integer(record.xp, 'hero.xp', 0, tacticsSaveLimits.maxSupplies), training: integer(record.training, 'hero.training', 0, tacticsSaveLimits.maxSupplies), stats: parseStats(record.stats) }
}
const parseUnit = (data: unknown, width: number, height: number): TacticsUnit => {
  const record = recordValue(data, 'unit')
  const stats = parseStats(record.stats)
  const side = record.side === 'player' || record.side === 'enemy' ? record.side : null
  if (!side || typeof record.acted !== 'boolean' || (record.heroId !== undefined && typeof record.heroId !== 'string')) throw new Error('unit state is invalid')
  return { id: text(record.id, 'unit.id', 64), side, heroId: record.heroId, name: text(record.name, 'unit.name', 32), color: text(record.color, 'unit.color', 32), x: integer(record.x, 'unit.x', 0, width - 1), y: integer(record.y, 'unit.y', 0, height - 1), hp: integer(record.hp, 'unit.hp', 0, stats.maxHp), stats, acted: record.acted }
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

export const tacticsSaveSchema = createRuntimeSchema<TacticsSave>((data) => {
  const record = recordValue(data, 'tactics save')
  if (record.version !== 1) throw new Error('tactics save version is unsupported')
  const stage = integer(record.stage, 'save.stage', 1, tacticsSaveLimits.maxStage)
  if (!Array.isArray(record.heroes) || record.heroes.length === 0 || record.heroes.length > tacticsSaveLimits.maxHeroes) throw new Error('save.heroes is invalid')
  const heroes = record.heroes.map(parseHero)
  unique('hero.id', heroes.map((hero) => hero.id))
  const battle = parseBattle(record.battle, new Set(heroes.map((hero) => hero.id)))
  if (battle && battle.stage !== stage) throw new Error('battle.stage must equal save.stage')
  return { version: 1, stage, supplies: integer(record.supplies, 'save.supplies', 0, tacticsSaveLimits.maxSupplies), heroes, battle }
})

const load = (): TacticsSave => loadRecord(storageKeys.tacticsV1, tacticsSaveSchema, createInitialTacticsSave)
const save = (value: TacticsSave) => saveRecord(storageKeys.tacticsV1, tacticsSaveSchema.parse(value))
const reset = (): TacticsSave => { const next = createInitialTacticsSave(); save(next); return next }
export const tacticsStore = { load, save, reset } satisfies StoreContract<TacticsSave>
