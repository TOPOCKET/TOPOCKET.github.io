/**
 * @file tactics-engine
 * @description 无限战棋的纯战斗与局外成长逻辑。
 */
import type { TacticsActionResult, TacticsBattle, TacticsHero, TacticsPoint, TacticsSave, TacticsStats, TacticsUnit } from '../model/tactics-model'

const boardSize = 8

const cloneSave = (save: TacticsSave): TacticsSave => ({
  ...save,
  heroes: save.heroes.map((hero) => ({ ...hero, stats: { ...hero.stats } })),
  battle: save.battle
    ? {
        ...save.battle,
        selectedUnitId: save.battle.selectedUnitId,
        units: save.battle.units.map((unit) => ({ ...unit, stats: { ...unit.stats } })),
        log: [...save.battle.log],
      }
    : null,
})

const makeHero = (id: string, name: string, color: string, stats: TacticsStats): TacticsHero => ({
  id,
  name,
  color,
  level: 1,
  xp: 0,
  training: 0,
  stats,
})

/**
 * createInitialTacticsSave。
 * @returns 初始战棋存档。
 */
export const createInitialTacticsSave = (): TacticsSave => ({
  version: 1,
  stage: 1,
  supplies: 0,
  heroes: [
    makeHero('hero-vanguard', '先锋', '#60a5fa', { maxHp: 24, atk: 7, def: 2, move: 3, range: 1 }),
    makeHero('hero-ranger', '游侠', '#34d399', { maxHp: 18, atk: 5, def: 1, move: 3, range: 2 }),
  ],
  battle: null,
})

const enemyCountForStage = (stage: number) => Math.min(6, 2 + Math.floor(stage / 2))

const enemyStatsForStage = (stage: number): TacticsStats => ({
  maxHp: 10 + stage * 3,
  atk: 4 + Math.floor(stage * 0.8),
  def: Math.floor(stage / 3),
  move: 2,
  range: 1,
})

const pushLog = (battle: TacticsBattle, message: string) => ({
  ...battle,
  log: [message, ...battle.log].slice(0, 8),
})

const distance = (a: TacticsPoint, b: TacticsPoint) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

const unitAt = (battle: TacticsBattle, x: number, y: number) =>
  battle.units.find((unit) => unit.hp > 0 && unit.x === x && unit.y === y)

const livingUnits = (battle: TacticsBattle, side: 'player' | 'enemy') =>
  battle.units.filter((unit) => unit.side === side && unit.hp > 0)

const withBattle = (save: TacticsSave, battle: TacticsBattle): TacticsSave => ({ ...save, battle })

const resolveBattleStatus = (save: TacticsSave): TacticsSave => {
  if (!save.battle) return save
  const players = livingUnits(save.battle, 'player')
  const enemies = livingUnits(save.battle, 'enemy')
  if (enemies.length === 0) return withBattle(save, pushLog({ ...save.battle, status: 'victory' }, '胜利！回到营地领取成长。'))
  if (players.length === 0) return withBattle(save, pushLog({ ...save.battle, status: 'defeat' }, '队伍全灭。可以在营地整备后重开本关。'))
  return save
}

/**
 * startTacticsBattle。
 * @param save 当前存档。
 * @returns 带新战斗的存档。
 */
export const startTacticsBattle = (save: TacticsSave): TacticsSave => {
  const next = cloneSave(save)
  const playerUnits: TacticsUnit[] = next.heroes.slice(0, 4).map((hero, index) => ({
    id: `unit-${hero.id}`,
    side: 'player',
    heroId: hero.id,
    name: hero.name,
    color: hero.color,
    x: 0,
    y: 1 + index * 2,
    hp: hero.stats.maxHp,
    stats: { ...hero.stats },
    acted: false,
  }))
  const enemyStats = enemyStatsForStage(next.stage)
  const enemyUnits: TacticsUnit[] = Array.from({ length: enemyCountForStage(next.stage) }, (_, index) => ({
    id: `enemy-${next.stage}-${index}`,
    side: 'enemy',
    name: `游荡者 ${index + 1}`,
    color: '#f97316',
    x: boardSize - 1 - (index % 2),
    y: Math.min(boardSize - 1, 1 + index),
    hp: enemyStats.maxHp,
    stats: { ...enemyStats },
    acted: false,
  }))
  return {
    ...next,
    battle: {
      id: `battle-${Date.now()}`,
      stage: next.stage,
      width: boardSize,
      height: boardSize,
      turn: 'player',
      round: 1,
      status: 'fighting',
      selectedUnitId: playerUnits[0]?.id ?? null,
      units: [...playerUnits, ...enemyUnits],
      log: [`第 ${next.stage} 层开始。`],
    },
  }
}

/**
 * selectTacticsUnit。
 * @param save 当前存档。
 * @param unitId 单位 id。
 * @returns 更新后的存档。
 */
export const selectTacticsUnit = (save: TacticsSave, unitId: string): TacticsSave => {
  if (!save.battle || save.battle.turn !== 'player') return save
  const unit = save.battle.units.find((item) => item.id === unitId && item.side === 'player' && item.hp > 0)
  if (!unit) return save
  return withBattle(save, { ...save.battle, selectedUnitId: unit.id })
}

/**
 * moveSelectedUnit。
 * @param save 当前存档。
 * @param point 目标格。
 * @returns 行动结果。
 */
export const moveSelectedUnit = (save: TacticsSave, point: TacticsPoint): TacticsActionResult => {
  const next = cloneSave(save)
  const battle = next.battle
  if (!battle || battle.turn !== 'player' || battle.status !== 'fighting') return { save, message: '当前不能移动。' }
  const unit = battle.units.find((item) => item.id === battle.selectedUnitId && item.side === 'player' && item.hp > 0)
  if (!unit) return { save, message: '请选择我方单位。' }
  if (unit.acted) return { save, message: '该单位本回合已经行动。' }
  if (point.x < 0 || point.y < 0 || point.x >= battle.width || point.y >= battle.height) return { save, message: '目标越界。' }
  if (unitAt(battle, point.x, point.y)) return { save, message: '目标格被占用。' }
  if (distance(unit, point) > unit.stats.move) return { save, message: '目标超出移动范围。' }
  unit.x = point.x
  unit.y = point.y
  unit.acted = true
  return { save: withBattle(next, pushLog(battle, `${unit.name} 移动到 (${point.x + 1}, ${point.y + 1})。`)), message: '移动完成。' }
}

/**
 * attackWithSelectedUnit。
 * @param save 当前存档。
 * @param targetId 目标单位 id。
 * @returns 行动结果。
 */
export const attackWithSelectedUnit = (save: TacticsSave, targetId: string): TacticsActionResult => {
  const next = cloneSave(save)
  const battle = next.battle
  if (!battle || battle.turn !== 'player' || battle.status !== 'fighting') return { save, message: '当前不能攻击。' }
  const attacker = battle.units.find((item) => item.id === battle.selectedUnitId && item.side === 'player' && item.hp > 0)
  const target = battle.units.find((item) => item.id === targetId && item.side === 'enemy' && item.hp > 0)
  if (!attacker || !target) return { save, message: '请选择有效目标。' }
  if (attacker.acted) return { save, message: '该单位本回合已经行动。' }
  if (distance(attacker, target) > attacker.stats.range) return { save, message: '目标超出射程。' }
  const damage = Math.max(1, attacker.stats.atk - target.stats.def)
  target.hp = Math.max(0, target.hp - damage)
  attacker.acted = true
  const result = resolveBattleStatus(withBattle(next, pushLog(battle, `${attacker.name} 对 ${target.name} 造成 ${damage} 点伤害。`)))
  return { save: result, message: '攻击完成。' }
}

const nearestPlayer = (battle: TacticsBattle, enemy: TacticsUnit) =>
  livingUnits(battle, 'player').sort((left, right) => distance(enemy, left) - distance(enemy, right))[0]

const stepToward = (battle: TacticsBattle, unit: TacticsUnit, target: TacticsUnit): TacticsPoint => {
  const options: TacticsPoint[] = [
    { x: unit.x + 1, y: unit.y },
    { x: unit.x - 1, y: unit.y },
    { x: unit.x, y: unit.y + 1 },
    { x: unit.x, y: unit.y - 1 },
  ]
  const valid = options.filter((point) =>
    point.x >= 0 &&
    point.y >= 0 &&
    point.x < battle.width &&
    point.y < battle.height &&
    !unitAt(battle, point.x, point.y),
  )
  return valid.sort((left, right) => distance(left, target) - distance(right, target))[0] ?? unit
}

/**
 * endPlayerTurn。
 * @param save 当前存档。
 * @returns 敌方行动后的存档。
 */
export const endPlayerTurn = (save: TacticsSave): TacticsSave => {
  let next = cloneSave(save)
  let battle = next.battle
  if (!battle || battle.turn !== 'player' || battle.status !== 'fighting') return save
  battle.turn = 'enemy'
  battle.selectedUnitId = null
  battle = pushLog(battle, '敌方回合。')
  for (const enemy of livingUnits(battle, 'enemy')) {
    const target = nearestPlayer(battle, enemy)
    if (!target) break
    if (distance(enemy, target) <= enemy.stats.range) {
      const damage = Math.max(1, enemy.stats.atk - target.stats.def)
      target.hp = Math.max(0, target.hp - damage)
      battle = pushLog(battle, `${enemy.name} 攻击 ${target.name}，造成 ${damage} 点伤害。`)
    } else {
      const step = stepToward(battle, enemy, target)
      enemy.x = step.x
      enemy.y = step.y
      battle = pushLog(battle, `${enemy.name} 向队伍逼近。`)
    }
  }
  battle.turn = 'player'
  battle.round += 1
  battle.units = battle.units.map((unit) => unit.side === 'player' ? { ...unit, acted: false } : unit)
  next = resolveBattleStatus(withBattle(next, pushLog(battle, `第 ${battle.round} 回合。`)))
  return next
}

/**
 * claimVictoryRewards。
 * @param save 当前存档。
 * @returns 领取奖励后的存档。
 */
export const claimVictoryRewards = (save: TacticsSave): TacticsSave => {
  if (!save.battle || save.battle.status !== 'victory') return save
  const xpGain = 8 + save.stage * 2
  return {
    ...save,
    stage: save.stage + 1,
    supplies: save.supplies + 2 + save.stage,
    battle: null,
    heroes: save.heroes.map((hero) => ({
      ...hero,
      xp: hero.xp + xpGain,
      training: hero.training + 1,
    })),
  }
}

/**
 * trainHeroStat。
 * @param save 当前存档。
 * @param heroId 角色 id。
 * @param stat 要成长的属性。
 * @returns 更新后的存档。
 */
export const trainHeroStat = (save: TacticsSave, heroId: string, stat: keyof Pick<TacticsStats, 'maxHp' | 'atk' | 'def'>): TacticsSave => ({
  ...save,
  heroes: save.heroes.map((hero) => {
    if (hero.id !== heroId || hero.training <= 0) return hero
    const gain = stat === 'maxHp' ? 3 : 1
    return {
      ...hero,
      level: hero.level + 1,
      training: hero.training - 1,
      stats: {
        ...hero.stats,
        [stat]: hero.stats[stat] + gain,
      },
    }
  }),
})

/**
 * addCustomHero。
 * @param save 当前存档。
 * @param name 角色名。
 * @param color 角色色。
 * @returns 添加角色后的存档。
 */
export const addCustomHero = (save: TacticsSave, name: string, color: string): TacticsSave => {
  const trimmed = name.trim()
  if (!trimmed) return save
  const id = `hero-${Date.now()}`
  return {
    ...save,
    heroes: [
      ...save.heroes,
      makeHero(id, trimmed.slice(0, 8), color, { maxHp: 20, atk: 6, def: 1, move: 3, range: 1 }),
    ],
  }
}
