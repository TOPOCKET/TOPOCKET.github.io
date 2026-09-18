/**
 * @file tactics-model
 * @description 无限战棋的存档、角色与战斗模型。
 */
export type TacticsSide = 'player' | 'enemy'

export type TacticsTurn = TacticsSide

export type TacticsBattleStatus = 'ready' | 'fighting' | 'victory' | 'defeat'
export type TacticsAttackStyle = 'melee' | 'ranged'
export type TacticsDamageType = 'physical' | 'magic' | 'psionic'
export type TacticsSkillFocus = 'healing' | 'damage' | 'buff'
export type TacticsSurvivalFocus = 'evasion' | 'defense' | 'regeneration' | 'shield' | 'lifesteal' | 'immunity'
export type TacticsAttributeName = 'strength' | 'technique' | 'agility' | 'constitution' | 'perception' | 'willpower'
export type TacticsAttributes = Record<TacticsAttributeName, number>

export interface TacticsEnergy { current: number; max: number; regen: number; name: string; color: string }
export interface TacticsProfession { id: string; name: string; attackStyle: TacticsAttackStyle; hasSummonKit: boolean; damageType: TacticsDamageType; skillFocus: TacticsSkillFocus; survivalFocus: TacticsSurvivalFocus; passiveSkillId: string; energy: Pick<TacticsEnergy, 'max' | 'regen' | 'name' | 'color'>; initialAttributes: TacticsAttributes; attributeGrowthWeights: TacticsAttributes }
export interface TacticsSkill { id: string; name: string; kind: 'active' | 'passive'; slot?: 'main' | 'secondary' | 'passive'; energyCost?: number; duration?: number; friendlyFire?: boolean; attackStyles?: TacticsAttackStyle[]; damageTypes?: TacticsDamageType[]; focuses?: TacticsSkillFocus[]; survivals?: TacticsSurvivalFocus[]; baseWeight: number; effect: 'damage' | 'heal' | 'buff' | 'bleed' | TacticsSurvivalFocus; value: number; range?: number }
export interface TacticsCombatState { shield: number; shieldMax: number; immunity: number; immunityMax: number; evasion: number; reduction: number; regeneration: number; lifesteal: number }

export interface TacticsStats {
  maxHp: number
  atk: number
  def: number
  move: number
  range: number
  actions: TacticsActionLimits
}

/** 每回合行动额度；角色成长或技能可以只调整这里。 */
export interface TacticsActionLimits {
  move: number
  attack: number
}

export interface TacticsHero {
  id: string
  name: string
  color: string
  level: number
  xp: number
  training: number
  stats: TacticsStats
  attributes: TacticsAttributes
  professionId: string
  learnedSkillIds: string[]
  equippedCoreSkillId: string | null
  equippedTacticalSkillIds: string[]
  skillDraft: string[] | null
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
  moved: number
  attacked: number
  professionId?: string
  learnedSkillIds?: string[]
  equippedCoreSkillId?: string | null
  equippedTacticalSkillIds?: string[]
  combat?: TacticsCombatState
  bonusMove?: number
  attackCooldown?: number
  energy?: TacticsEnergy
  attributes?: TacticsAttributes
  damageOverTime?: number
  damageOverTimeTurns?: number
  counterTiming?: 'before' | 'after'
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
  version: 7
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

export interface TacticsReachableCell extends TacticsPoint {
  path: TacticsPoint[]
}

export interface TacticsMoveThenAttackOption {
  targetId: string
  landing: TacticsReachableCell
}
