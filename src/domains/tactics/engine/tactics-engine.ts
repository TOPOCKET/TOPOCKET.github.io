/** 无限战棋的纯战斗与局外成长逻辑。 */
import type { TacticsActionResult, TacticsBattle, TacticsMoveThenAttackOption, TacticsPoint, TacticsReachableCell, TacticsSave, TacticsUnit } from '../model/tactics-model'
import { enemyCountForStage, enemyStatsForStage, tacticsBoardSize } from '../config/tactics-balance'
import { professionById, skillById } from '../config/tactics-professions'
import { claimVictoryRewards } from './tactics-progression'

export { createInitialTacticsSave } from '../config/tactics-balance'
export { addCustomHero, claimVictoryRewards, equipHeroSkill, learnDraftSkill, trainHeroStat } from './tactics-progression'

const cloneSave = (save: TacticsSave): TacticsSave => ({ ...save, heroes: save.heroes.map((hero) => ({ ...hero, learnedSkillIds: [...hero.learnedSkillIds], skillDraft: hero.skillDraft ? [...hero.skillDraft] : null, stats: { ...hero.stats, actions: { ...hero.stats.actions } } })), battle: save.battle ? { ...save.battle, units: save.battle.units.map((unit) => ({ ...unit, learnedSkillIds: unit.learnedSkillIds ? [...unit.learnedSkillIds] : [], energy: unit.energy ? { ...unit.energy } : undefined, combat: unit.combat ? { ...unit.combat } : undefined, stats: { ...unit.stats, actions: { ...unit.stats.actions } } })), log: [...save.battle.log] } : null })
const key = (point: TacticsPoint) => `${point.x},${point.y}`
const distance = (a: TacticsPoint, b: TacticsPoint) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
const inBoard = (battle: TacticsBattle, point: TacticsPoint) => point.x >= 0 && point.y >= 0 && point.x < battle.width && point.y < battle.height
const neighbors = (point: TacticsPoint): TacticsPoint[] => [{ x: point.x + 1, y: point.y }, { x: point.x - 1, y: point.y }, { x: point.x, y: point.y + 1 }, { x: point.x, y: point.y - 1 }]
const pushLog = (battle: TacticsBattle, message: string) => ({ ...battle, log: [message, ...battle.log].slice(0, 8) })
const livingUnits = (battle: TacticsBattle, side: TacticsUnit['side']) => battle.units.filter((unit) => unit.side === side && unit.hp > 0)
const withBattle = (save: TacticsSave, battle: TacticsBattle): TacticsSave => ({ ...save, battle })
const canPlayerAct = (battle: TacticsBattle, unit: TacticsUnit) => battle.status === 'fighting' && battle.turn === 'player' && unit.side === 'player' && unit.hp > 0
const combatState = (professionId: string, skills: string[]) => { const state = { shield: 0, shieldMax: 0, immunity: 0, immunityMax: 2, evasion: 0, reduction: 0, regeneration: 0, lifesteal: 0 }; for (const id of [professionById(professionId)?.passiveSkillId, ...skills]) { const skill = id && skillById(id); if (!skill || skill.kind !== 'passive') continue; if (skill.effect === 'shield') { state.shield += skill.value; state.shieldMax += skill.value }; if (skill.effect === 'immunity') state.immunity = Math.min(state.immunityMax, state.immunity + skill.value); if (skill.effect === 'evasion') state.evasion += skill.value; if (skill.effect === 'defense') state.reduction += skill.value; if (skill.effect === 'regeneration') state.regeneration += skill.value; if (skill.effect === 'lifesteal') state.lifesteal += skill.value }; return state }
const energyState = (professionId: string) => { const energy = professionById(professionId)?.energy ?? { max: 5, regen: 0, name: '体力', color: '#fb7185' }; return { ...energy, current: energy.max } }
const attributeForDamageType = (unit: TacticsUnit, type: 'physical' | 'magic' | 'psionic') => !unit.attributes ? unit.stats.atk : type === 'physical' ? unit.attributes.strength : type === 'magic' ? unit.attributes.perception : unit.attributes.willpower
const layeredLevel = (value: number) => { const guaranteed = Math.floor(value / 100); return guaranteed + (Math.random() * 100 < value % 100 ? 1 : 0) }
const criticalMultiplier = (unit: TacticsUnit) => { const level = layeredLevel(unit.attributes?.technique ?? 0); return level ? 1.5 * level : 1 }
const receiveDamage = (target: TacticsUnit, raw: number, type: 'physical' | 'magic' | 'psionic' = 'physical') => { const state = target.combat; if (state?.immunity) { state.immunity -= 1; return 0 }; const dodgeLevel = layeredLevel((target.attributes?.agility ?? 0) + (state?.evasion ?? 0)); let damage = Math.max(1, raw * Math.pow(.5, dodgeLevel)); const resistance = attributeForDamageType(target, type); damage *= 1 - resistance / (resistance + 100); damage = Math.max(1, damage - (state?.reduction ?? 0)); if (state?.shield) { const absorbed = Math.min(state.shield, damage); state.shield -= absorbed; damage -= absorbed }; damage = Math.floor(damage); target.hp = Math.max(0, target.hp - damage); return damage }

/** 坐标索引仅存在于运行时，避免路径/目标计算结果进入存档。 */
export const createUnitIndex = (battle: TacticsBattle) => new Map(battle.units.filter((unit) => unit.hp > 0).map((unit) => [key(unit), unit]))

/** 基于格子阻挡的 BFS 可达格；后续地形只需在此处扩展通行规则。 */
export const getMovableCells = (battle: TacticsBattle, unit: TacticsUnit): TacticsReachableCell[] => {
  if (!canPlayerAct(battle, unit) || unit.moved >= unit.stats.actions.move) return []
  const occupied = createUnitIndex(battle); const canPassUnits = unit.professionId === 'assassin'; const origin = { x: unit.x, y: unit.y }; const queue: TacticsReachableCell[] = [{ ...origin, path: [] }]; const visited = new Set([key(origin)]); const result: TacticsReachableCell[] = []
  while (queue.length) { const current = queue.shift()!; if (current.path.length >= unit.stats.move + (unit.bonusMove ?? 0)) continue; for (const point of neighbors(current)) { const pointKey = key(point); const occupiedHere = occupied.has(pointKey); if (!inBoard(battle, point) || visited.has(pointKey) || (occupiedHere && !canPassUnits)) continue; visited.add(pointKey); const next = { ...point, path: [...current.path, point] }; if (!occupiedHere) result.push(next); queue.push(next) } }
  return result
}

/** 当前站位可攻击的敌人。攻击范围不穿透规则可在这里替换为射线/地形规则。 */
export const getAttackableTargets = (battle: TacticsBattle, unit: TacticsUnit) => canPlayerAct(battle, unit) && !unit.attackCooldown && unit.attacked < unit.stats.actions.attack ? livingUnits(battle, 'enemy').filter((target) => distance(unit, target) <= unit.stats.range) : []

/** 每个敌人的最短推荐落点，供拖动预览与“移动后攻击”领域命令复用。 */
export const getMoveThenAttackOptions = (battle: TacticsBattle, unit: TacticsUnit): TacticsMoveThenAttackOption[] => {
  if (!canPlayerAct(battle, unit) || unit.attacked >= unit.stats.actions.attack) return []
  const reachable = getMovableCells(battle, unit)
  return livingUnits(battle, 'enemy').flatMap((target) => { const landing = reachable.filter((cell) => distance(cell, target) <= unit.stats.range).sort((a, b) => a.path.length - b.path.length || distance(a, target) - distance(b, target))[0]; return landing ? [{ targetId: target.id, landing }] : [] })
}

/** 指定敌人的全部可达攻击落点；UI 可让玩家在这些等价方案中自主选择。 */
export const getMoveThenAttackLandings = (battle: TacticsBattle, unit: TacticsUnit, targetId: string): TacticsReachableCell[] => {
  if (!canPlayerAct(battle, unit) || unit.attacked >= unit.stats.actions.attack) return []
  const target = livingUnits(battle, 'enemy').find((item) => item.id === targetId)
  return target ? getMovableCells(battle, unit).filter((cell) => distance(cell, target) <= unit.stats.range).sort((a, b) => a.path.length - b.path.length || a.y - b.y || a.x - b.x) : []
}

const resolveBattleStatus = (save: TacticsSave): TacticsSave => { if (!save.battle) return save; if (!livingUnits(save.battle, 'enemy').length) return withBattle(save, pushLog({ ...save.battle, status: 'victory' }, '胜利！回到营地领取成长。')); if (!livingUnits(save.battle, 'player').length) return withBattle(save, pushLog({ ...save.battle, status: 'defeat' }, '队伍全灭。可以在营地整备后重开本关。')); return save }

export const startTacticsBattle = (save: TacticsSave): TacticsSave => {
  const next = cloneSave(save)
  const playerUnits: TacticsUnit[] = next.heroes.slice(0, 6).map((hero, index) => { const stats = { ...hero.stats, maxHp: 10 + hero.attributes.constitution * 2, actions: { ...hero.stats.actions } }; return { id: `unit-${hero.id}`, side: 'player', heroId: hero.id, name: hero.name, color: hero.color, x: 0, y: index, hp: stats.maxHp, stats, attributes: { ...hero.attributes }, moved: 0, attacked: 0, professionId: hero.professionId, learnedSkillIds: hero.learnedSkillIds, energy: energyState(hero.professionId), combat: combatState(hero.professionId, hero.learnedSkillIds) } })
  const enemyStats = enemyStatsForStage(next.stage); const enemyUnits: TacticsUnit[] = Array.from({ length: enemyCountForStage(next.stage) }, (_, index) => ({ id: `enemy-${next.stage}-${index}`, side: 'enemy', name: `游荡者 ${index + 1}`, color: '#f97316', x: tacticsBoardSize - 1 - (index % 2), y: Math.min(tacticsBoardSize - 1, 1 + index), hp: enemyStats.maxHp, stats: { ...enemyStats, actions: { ...enemyStats.actions } }, moved: 0, attacked: 0 }))
  return { ...next, battle: { id: `battle-${Date.now()}`, stage: next.stage, width: tacticsBoardSize, height: tacticsBoardSize, turn: 'player', round: 1, status: 'fighting', selectedUnitId: playerUnits[0]?.id ?? null, units: [...playerUnits, ...enemyUnits], log: [`第 ${next.stage} 层开始。`] } }
}

export const selectTacticsUnit = (save: TacticsSave, unitId: string): TacticsSave => { if (!save.battle || save.battle.turn !== 'player') return save; const unit = save.battle.units.find((item) => item.id === unitId && item.side === 'player' && item.hp > 0); return unit ? withBattle(save, { ...save.battle, selectedUnitId: unit.id }) : save }

export const moveSelectedUnit = (save: TacticsSave, point: TacticsPoint): TacticsActionResult => { const next = cloneSave(save); const battle = next.battle; const unit = battle?.units.find((item) => item.id === battle.selectedUnitId); if (!battle || !unit || !canPlayerAct(battle, unit)) return { save, message: '当前不能移动。' }; const destination = getMovableCells(battle, unit).find((cell) => cell.x === point.x && cell.y === point.y); if (!destination) return { save, message: unit.moved >= unit.stats.actions.move ? '移动次数已用完。' : '目标不可达：路径被棋子阻挡或超出移动范围。' }; unit.x = point.x; unit.y = point.y; unit.moved += 1; return { save: withBattle(next, pushLog(battle, `${unit.name} 移动到 (${point.x + 1}, ${point.y + 1})。`)), message: '移动完成。' } }

const restoreEnergy = (unit: TacticsUnit, amount: number) => { if (unit.energy) unit.energy.current = Math.min(unit.energy.max, unit.energy.current + amount) }
const derivedMaxHp = (unit: Pick<TacticsUnit, 'attributes' | 'stats'>) => unit.attributes ? 10 + unit.attributes.constitution * 2 : unit.stats.maxHp
const constitutionRecovery = (unit: TacticsUnit) => unit.attributes ? Math.floor(1 + unit.attributes.constitution / 10 + derivedMaxHp(unit) * .01) : 0
const canCounter = (unit: TacticsUnit, against: TacticsUnit) => unit.hp > 0 && distance(unit, against) <= unit.stats.range
const counterattack = (source: TacticsUnit, target: TacticsUnit) => canCounter(source, target) ? receiveDamage(target, attributeForDamageType(source, professionById(source.professionId ?? '')?.damageType ?? 'physical') * criticalMultiplier(source), professionById(source.professionId ?? '')?.damageType ?? 'physical') : 0
const attack = (next: TacticsSave, attacker: TacticsUnit, target: TacticsUnit, movedFirst = false): TacticsActionResult => { const battle = next.battle!; const damageType = professionById(attacker.professionId ?? '')?.damageType ?? 'physical'; const coreSkill = (attacker.learnedSkillIds ?? []).map(skillById).find((skill) => skill?.kind === 'active' && skill.slot === 'main' && skill.effect === 'damage' && (attacker.energy?.current ?? 0) >= (skill.energyCost ?? 0)); const beforeCounter = target.counterTiming === 'before' ? counterattack(target, attacker) : 0; const rawDamage = (attributeForDamageType(attacker, damageType) + (coreSkill?.value ?? 0)) * criticalMultiplier(attacker) * (attacker.professionId === 'crossbowman' ? 2 : 1); const damage = attacker.hp > 0 ? receiveDamage(target, rawDamage, damageType) : 0; if (coreSkill && attacker.energy) attacker.energy.current -= coreSkill.energyCost ?? 0; const tactic = (attacker.learnedSkillIds ?? []).map(skillById).find((skill) => skill?.kind === 'active' && skill.slot === 'secondary' && skill.effect === 'bleed'); if (damage && tactic && target.hp > 0) { target.damageOverTime = Math.max(target.damageOverTime ?? 0, tactic.value); target.damageOverTimeTurns = Math.max(target.damageOverTimeTurns ?? 0, tactic.duration ?? 1) }; const afterCounter = target.counterTiming !== 'before' ? counterattack(target, attacker) : 0; if (damage && attacker.combat?.lifesteal) attacker.hp = Math.min(attacker.stats.maxHp, attacker.hp + Math.floor(damage * attacker.combat.lifesteal / 100)); if (professionById(attacker.professionId ?? '')?.skillFocus === 'damage') restoreEnergy(attacker, 1); attacker.attacked += 1; if (attacker.professionId === 'raider-cavalry') attacker.bonusMove = (attacker.bonusMove ?? 0) + 1; if (attacker.professionId === 'crossbowman') attacker.attackCooldown = 2; const prefix = movedFirst ? `${attacker.name} 移动后攻击` : `${attacker.name} 对`; const notes = [coreSkill ? `触发核心技「${coreSkill.name}」` : '', tactic && damage ? `附加「${tactic.name}」` : '', beforeCounter || afterCounter ? `${target.name} 反击 ${beforeCounter || afterCounter} 点` : ''].filter(Boolean).join('；'); return { save: claimVictoryRewards(resolveBattleStatus(withBattle(next, pushLog(battle, `${prefix} ${target.name} 造成 ${damage} 点伤害${notes ? `，${notes}` : ''}。`)))), message: '攻击完成。' } }

export const attackWithSelectedUnit = (save: TacticsSave, targetId: string): TacticsActionResult => { const next = cloneSave(save); const battle = next.battle; const attacker = battle?.units.find((item) => item.id === battle.selectedUnitId); const target = battle?.units.find((item) => item.id === targetId && item.side === 'enemy' && item.hp > 0); if (!battle || !attacker || !target || !canPlayerAct(battle, attacker)) return { save, message: '当前不能攻击。' }; if (attacker.attackCooldown) return { save, message: '重弩手正在冷却，本回合不能攻击。' }; if (attacker.attacked >= attacker.stats.actions.attack) return { save, message: '攻击次数已用完。' }; if (!getAttackableTargets(battle, attacker).some((item) => item.id === targetId)) return { save, message: '目标超出射程。' }; return attack(next, attacker, target) }

/** 技能同样占用一次攻击额度；非伤害技能可指定友军。 */
export const useSelectedSkill = (save: TacticsSave, skillId: string, targetId: string): TacticsActionResult => {
  const next = cloneSave(save); const battle = next.battle; const caster = battle?.units.find((unit) => unit.id === battle.selectedUnitId); const target = battle?.units.find((unit) => unit.id === targetId && unit.hp > 0); const skill = skillById(skillId)
  if (!battle || !caster || !target || !skill || skill.kind !== 'active' || !caster.learnedSkillIds?.includes(skillId) || !canPlayerAct(battle, caster) || caster.attacked >= caster.stats.actions.attack) return { save, message: '当前不能施放该技能。' }
  if (skill.slot === 'main' || skill.slot === 'secondary') return { save, message: '主动技能会在攻击时自动触发。' }
  if ((caster.energy?.current ?? 0) < (skill.energyCost ?? 0)) return { save, message: `${caster.energy?.name ?? '能量'}不足。` }
  if (distance(caster, target) > (skill.range ?? caster.stats.range)) return { save, message: '目标超出技能范围。' }
  if (skill.effect === 'damage') { if (target.side === caster.side) return { save, message: '伤害技能只能指定敌人。' }; const damage = receiveDamage(target, caster.stats.atk + skill.value); if (caster.energy) caster.energy.current -= skill.energyCost ?? 0; caster.attacked += 1; return { save: claimVictoryRewards(resolveBattleStatus(withBattle(next, pushLog(battle, `${caster.name} 使用 ${skill.name}，造成 ${damage} 点伤害。`)))), message: '技能施放完成。' } }
  if (target.side !== caster.side) return { save, message: '该技能只能指定友军。' }
  if (skill.effect === 'heal') { target.hp = Math.min(target.stats.maxHp, target.hp + skill.value); if (professionById(caster.professionId ?? '')?.skillFocus === 'healing') restoreEnergy(caster, 1) }
  if (skill.effect === 'buff') { target.combat = target.combat ?? combatState(target.professionId ?? 'adept', target.learnedSkillIds ?? []); target.combat.shield = Math.min(target.combat.shieldMax + skill.value, target.combat.shield + skill.value) }
  if (caster.energy) caster.energy.current -= skill.energyCost ?? 0
  caster.attacked += 1
  return { save: withBattle(next, pushLog(battle, `${caster.name} 使用 ${skill.name}。`)), message: '技能施放完成。' }
}

/** 原子领域命令：验证推荐落点后一次完成移动和攻击。 */
export const moveThenAttackWithSelectedUnit = (save: TacticsSave, targetId: string, landing?: TacticsPoint): TacticsActionResult => { const next = cloneSave(save); const battle = next.battle; const attacker = battle?.units.find((item) => item.id === battle.selectedUnitId); const target = battle?.units.find((item) => item.id === targetId && item.side === 'enemy' && item.hp > 0); if (!battle || !attacker || !target || !canPlayerAct(battle, attacker)) return { save, message: '当前不能执行移动后攻击。' }; if (attacker.attackCooldown) return { save, message: '重弩手正在冷却，本回合不能攻击。' }; const choices = getMoveThenAttackLandings(battle, attacker, targetId); const destination = landing ? choices.find((cell) => cell.x === landing.x && cell.y === landing.y) : choices[0]; if (!destination) return { save, message: '无可达落点可攻击该目标。' }; attacker.x = destination.x; attacker.y = destination.y; attacker.moved += 1; return attack(next, attacker, target, true) }

const nearestPlayer = (battle: TacticsBattle, enemy: TacticsUnit) => livingUnits(battle, 'player').sort((a, b) => distance(enemy, a) - distance(enemy, b))[0]
const stepToward = (battle: TacticsBattle, unit: TacticsUnit, target: TacticsUnit) => getMovableCells({ ...battle, turn: 'player' }, { ...unit, side: 'player', moved: 0 }).sort((a, b) => distance(a, target) - distance(b, target))[0] ?? unit

export const endPlayerTurn = (save: TacticsSave): TacticsSave => { let next = cloneSave(save); let battle = next.battle; if (!battle || battle.turn !== 'player' || battle.status !== 'fighting') return save; battle.turn = 'enemy'; battle.selectedUnitId = null; battle = pushLog(battle, '敌方回合。'); for (const enemy of livingUnits(battle, 'enemy')) { if (enemy.damageOverTime && enemy.damageOverTimeTurns) { const damage = receiveDamage(enemy, enemy.damageOverTime); enemy.damageOverTimeTurns -= 1; if (!enemy.damageOverTimeTurns) enemy.damageOverTime = 0; battle = pushLog(battle, `${enemy.name} 受到持续伤害 ${damage} 点。`) } }; for (const enemy of livingUnits(battle, 'enemy')) { const target = nearestPlayer(battle, enemy); if (!target) break; if (distance(enemy, target) <= enemy.stats.range) { const damage = receiveDamage(target, enemy.stats.atk); battle = pushLog(battle, `${enemy.name} 攻击 ${target.name}，造成 ${damage} 点伤害。`) } else { const step = stepToward(battle, enemy, target); enemy.x = step.x; enemy.y = step.y; battle = pushLog(battle, `${enemy.name} 向队伍逼近。`) } }; battle.turn = 'player'; battle.round += 1; battle.units = battle.units.map((unit) => { if (unit.side !== 'player') return unit; if (unit.energy) unit.energy.current = Math.min(unit.energy.max, unit.energy.current + unit.energy.regen + (professionById(unit.professionId ?? '')?.skillFocus === 'buff' ? 2 : 0)); return { ...unit, hp: Math.min(unit.stats.maxHp, unit.hp + constitutionRecovery(unit) + (unit.combat?.regeneration ?? 0)), bonusMove: 0, attackCooldown: unit.attackCooldown ? unit.attackCooldown - 1 : 0, moved: 0, attacked: 0 } }); next = resolveBattleStatus(withBattle(next, pushLog(battle, `第 ${battle.round} 回合。`))); return next }
