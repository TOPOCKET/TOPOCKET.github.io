/**
 * @file tactics-model
 * @description 无限战棋的存档、角色与战斗模型。
 */
export type TacticsSide = 'player' | 'enemy'

export type TacticsTurn = TacticsSide

export type TacticsBattleStatus = 'ready' | 'fighting' | 'victory' | 'defeat'

export interface TacticsStats {
  maxHp: number
  atk: number
  def: number
  move: number
  range: number
}

export interface TacticsHero {
  id: string
  name: string
  color: string
  level: number
  xp: number
  training: number
  stats: TacticsStats
}

export interface TacticsUnit {
  id: string
  side: TacticsSide
  heroId?: string
  name: string
  color: string
  x: number
  y: number
  hp: number
  stats: TacticsStats
  acted: boolean
}

export interface TacticsBattle {
  id: string
  stage: number
  width: number
  height: number
  turn: TacticsTurn
  round: number
  status: TacticsBattleStatus
  selectedUnitId: string | null
  units: TacticsUnit[]
  log: string[]
}

export interface TacticsSave {
  version: 1
  stage: number
  supplies: number
  heroes: TacticsHero[]
  battle: TacticsBattle | null
}

export interface TacticsPoint {
  x: number
  y: number
}

export interface TacticsActionResult {
  save: TacticsSave
  message: string
}
