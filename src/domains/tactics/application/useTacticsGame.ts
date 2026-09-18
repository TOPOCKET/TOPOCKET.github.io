import { computed, ref, watch } from 'vue'
import { addCustomHero, attackWithSelectedUnit, claimVictoryRewards, createUnitIndex, endPlayerTurn, getAttackableTargets, getMovableCells, getMoveThenAttackLandings, getMoveThenAttackOptions, moveSelectedUnit, moveThenAttackWithSelectedUnit, selectTacticsUnit, startTacticsBattle, trainHeroStat, useSelectedSkill } from '../engine/tactics-engine'
import type { TacticsHero, TacticsPoint, TacticsSkill, TacticsStats, TacticsUnit } from '../model/tactics-model'
import { equipHeroSkill, learnDraftSkill, tacticsHeroCapacity } from '../engine/tactics-progression'
import { professionById, skillById } from '../config/tactics-professions'
import { tacticsStore } from '../services/tactics-store'

type DragPreview = 'move' | 'attack' | 'move-attack' | 'invalid' | null
const pointKey = (point: TacticsPoint) => `${point.x},${point.y}`

export const useTacticsGame = () => {
  const save = ref(tacticsStore.load()); const message = ref('欢迎来到营地。'); const customName = ref(''); const customColor = ref('#a78bfa')
  const dragUnitId = ref<string | null>(null); const dragPoint = ref<TacticsPoint | null>(null); const dragPreview = ref<DragPreview>(null); const dragTargetId = ref<string | null>(null); const dragLanding = ref<TacticsPoint | null>(null); const dragLandingKeys = ref<Set<string>>(new Set()); const dragPathKeys = ref<Set<string>>(new Set()); const dragged = ref(false); const pendingSkillId = ref<string | null>(null); const boardZoom = ref(1.3); const boardScroll = ref<HTMLElement | null>(null); const boardPan = ref<{ pointerId: number, x: number, y: number, left: number, top: number } | null>(null); const inspectedUnitId = ref<string | null>(null); const detailHeroId = ref<string | null>(null)
  const battle = computed(() => save.value.battle)
  const selectedUnit = computed(() => battle.value?.units.find((unit) => unit.id === battle.value?.selectedUnitId && unit.hp > 0) ?? null)
  const inspectedUnit = computed(() => battle.value?.units.find((unit) => unit.id === inspectedUnitId.value && unit.hp > 0) ?? selectedUnit.value)
  const detailHero = computed(() => save.value.heroes.find((hero) => hero.id === detailHeroId.value) ?? null)
  // 拖动期间以起始棋子为唯一规则来源，避免响应式选中状态切换时沿用上一角色的落点。
  const interactionUnit = computed(() => battle.value?.units.find((unit) => unit.id === dragUnitId.value && unit.hp > 0) ?? selectedUnit.value)
  const unitIndex = computed(() => battle.value ? createUnitIndex(battle.value) : new Map())
  const cells = computed(() => { const current = battle.value; if (!current) return []; return Array.from({ length: current.width * current.height }, (_, index) => { const x = index % current.width; const y = Math.floor(index / current.width); return { x, y, unit: unitIndex.value.get(pointKey({ x, y })) ?? null } }) })
  const movableCells = computed(() => battle.value && interactionUnit.value ? getMovableCells(battle.value, interactionUnit.value) : [])
  const attackableTargets = computed(() => battle.value && interactionUnit.value ? getAttackableTargets(battle.value, interactionUnit.value) : [])
  const moveThenAttackOptions = computed(() => battle.value && interactionUnit.value ? getMoveThenAttackOptions(battle.value, interactionUnit.value) : [])
  const movableKeys = computed(() => new Set(movableCells.value.map(pointKey)))
  const attackableIds = computed(() => new Set(attackableTargets.value.map((unit) => unit.id)))
  const moveAttackByTarget = computed(() => new Map(moveThenAttackOptions.value.map((option) => [option.targetId, option])))
  const unitAt = (x: number, y: number): TacticsUnit | null => unitIndex.value.get(pointKey({ x, y })) ?? null
  const hpPercent = (unit: TacticsUnit) => `${Math.max(0, Math.round((unit.hp / unit.stats.maxHp) * 100))}%`
  const statText = (stats: TacticsStats) => `HP ${stats.maxHp} / 攻 ${stats.atk} / 防 ${stats.def} / 移 ${stats.move} / 射 ${stats.range}`
  const actionText = (unit: TacticsUnit) => `移动 ${unit.moved}/${unit.stats.actions.move} · 攻击 ${unit.attacked}/${unit.stats.actions.attack}`
  const estimatedDamage = computed(() => selectedUnit.value && inspectedUnit.value?.side === 'enemy' ? Math.max(1, selectedUnit.value.stats.atk * (selectedUnit.value.professionId === 'crossbowman' ? 2 : 1) - inspectedUnit.value.stats.def - (inspectedUnit.value.combat?.reduction ?? 0)) : null)
  const activeSkills = computed<TacticsSkill[]>(() => [])
  const select = (unit: TacticsUnit) => { save.value = selectTacticsUnit(save.value, unit.id) }
  const handleCell = (x: number, y: number) => { if (dragged.value) return; const unit = unitAt(x, y); if (pendingSkillId.value && unit) { const result = useSelectedSkill(save.value, pendingSkillId.value, unit.id); save.value = result.save; message.value = result.message; pendingSkillId.value = null; return }; if (unit?.side === 'player') select(unit); else { const result = unit?.side === 'enemy' ? (attackableIds.value.has(unit.id) ? attackWithSelectedUnit(save.value, unit.id) : moveThenAttackWithSelectedUnit(save.value, unit.id)) : moveSelectedUnit(save.value, { x, y }); save.value = result.save; message.value = result.message } }
  const prepareSkill = (skillId: string) => { pendingSkillId.value = pendingSkillId.value === skillId ? null : skillId; message.value = pendingSkillId.value ? '请选择战术技目标。' : '已取消战术技。' }
  const zoomBoard = (delta: number) => { boardZoom.value = Math.max(.65, Math.min(1.95, Number((boardZoom.value + delta).toFixed(2)))) }
  const zoomBoardWithWheel = (event: WheelEvent) => zoomBoard(event.deltaY > 0 ? -.1 : .1)
  const inspectUnit = (unit: TacticsUnit | null) => { inspectedUnitId.value = unit?.id ?? null }
  const openHeroDetail = (heroId: string) => { detailHeroId.value = heroId }
  const closeHeroDetail = () => { detailHeroId.value = null }
  const setBoardScroll = (element: unknown) => { boardScroll.value = element instanceof HTMLElement ? element : null }
  const beginBoardPan = (event: PointerEvent) => { if (event.button !== 1 && !event.altKey) return; const element = boardScroll.value; if (!element) return; event.preventDefault(); boardPan.value = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: element.scrollLeft, top: element.scrollTop }; element.setPointerCapture?.(event.pointerId) }
  const moveBoardPan = (event: PointerEvent) => { const pan = boardPan.value; const element = boardScroll.value; if (!pan || !element || pan.pointerId !== event.pointerId) return; element.scrollLeft = pan.left - (event.clientX - pan.x); element.scrollTop = pan.top - (event.clientY - pan.y) }
  const endBoardPan = (event: PointerEvent) => { if (boardPan.value?.pointerId === event.pointerId) boardPan.value = null }
  const previewAt = (point: TacticsPoint): DragPreview => { const unit = unitAt(point.x, point.y); if (unit?.side === 'enemy') return attackableIds.value.has(unit.id) ? 'attack' : moveAttackByTarget.value.has(unit.id) ? 'move-attack' : 'invalid'; return movableKeys.value.has(pointKey(point)) ? 'move' : 'invalid' }
  const beginDrag = (event: PointerEvent, unit: TacticsUnit) => { if (event.button !== 0 || event.altKey || unit.side !== 'player' || battle.value?.status !== 'fighting') return; select(unit); dragUnitId.value = unit.id; dragPoint.value = { x: event.clientX, y: event.clientY }; dragPreview.value = null; clearDragPreview(); dragged.value = false; (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId) }
  const pointFromPointer = (event: PointerEvent): TacticsPoint | null => {
    const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-tactics-cell]')
    const x = Number(element?.dataset.x); const y = Number(element?.dataset.y)
    return element && Number.isInteger(x) && Number.isInteger(y) ? { x, y } : null
  }
  // Pointer capture keeps touch drags alive, so the event target remains the source piece.
  // Resolve the actual cell from coordinates instead of trusting event.currentTarget.
  const clearLandingPreview = () => { dragLanding.value = null; dragLandingKeys.value = new Set(); dragPathKeys.value = new Set() }
  const clearDragPreview = () => { dragTargetId.value = null; clearLandingPreview() }
  const updateDrag = (event: PointerEvent) => {
    if (!dragUnitId.value) return
    dragged.value = true; dragPoint.value = { x: event.clientX, y: event.clientY }
    const point = pointFromPointer(event); const nextPreview = point ? previewAt(point) : 'invalid'
    if (nextPreview === 'invalid') clearLandingPreview()
    dragPreview.value = nextPreview
    if (!point) return
    const target = unitAt(point.x, point.y)
    if (target?.side === 'enemy' && moveAttackByTarget.value.has(target.id)) dragTargetId.value = target.id
    const dragUnit = interactionUnit.value
    const landings = dragTargetId.value && battle.value && dragUnit ? getMoveThenAttackLandings(battle.value, dragUnit, dragTargetId.value) : []
    dragLandingKeys.value = new Set(landings.map(pointKey))
    const chosenLanding = landings.find((cell) => cell.x === point.x && cell.y === point.y)
    if (dragTargetId.value && chosenLanding) { dragPreview.value = 'move-attack'; dragLanding.value = chosenLanding; dragPathKeys.value = new Set(chosenLanding.path.map(pointKey)); return }
    if (dragPreview.value === 'move-attack' && landings[0]) { dragLanding.value = landings[0]; dragPathKeys.value = new Set(landings[0].path.map(pointKey)); return }
    if (dragPreview.value === 'move') { dragLanding.value = point; dragPathKeys.value = new Set([pointKey(point)]) }
  }
  const finishDrag = (event: PointerEvent) => { if (!dragUnitId.value) return; const point = pointFromPointer(event); const unit = point ? unitAt(point.x, point.y) : null; let result = null; if (point && dragPreview.value === 'move') result = moveSelectedUnit(save.value, point); if (dragPreview.value === 'attack' && unit) result = attackWithSelectedUnit(save.value, unit.id); if (dragPreview.value === 'move-attack' && dragTargetId.value && dragLanding.value) result = moveThenAttackWithSelectedUnit(save.value, dragTargetId.value, dragLanding.value); if (result) { save.value = result.save; message.value = result.message } else message.value = '无效操作。'; dragUnitId.value = null; dragPoint.value = null; dragPreview.value = null; clearDragPreview(); setTimeout(() => { dragged.value = false }, 0) }
  const cancelDrag = () => { if (dragUnitId.value) message.value = '已取消拖放。'; dragUnitId.value = null; dragPoint.value = null; dragPreview.value = null; clearDragPreview(); setTimeout(() => { dragged.value = false }, 0) }
  const startBattle = () => { save.value = startTacticsBattle(save.value); message.value = '战斗开始。' }; const finishTurn = () => { save.value = endPlayerTurn(save.value); message.value = '回合推进。' }; const claimRewards = () => { save.value = claimVictoryRewards(save.value); message.value = '奖励已领取，新的远征层数已开启。' }; const resetRun = () => { save.value = tacticsStore.reset(); message.value = '存档已重置。' }
  const train = (hero: TacticsHero, stat: keyof Pick<TacticsStats, 'maxHp' | 'atk' | 'def'>) => { save.value = trainHeroStat(save.value, hero.id, stat); message.value = `${hero.name} 完成训练。` }
  const addHero = () => { const before = save.value.heroes.length; save.value = addCustomHero(save.value, customName.value, customColor.value); if (save.value.heroes.length > before) { message.value = '新角色已加入队伍。'; customName.value = '' } else message.value = save.value.heroes.length >= tacticsHeroCapacity ? '队伍已达到 12 名角色上限。' : '请输入角色名。' }
  const professionName = (hero: TacticsHero) => professionById(hero.professionId)?.name ?? '未知职业'
  const professionPassiveDetail = (professionId: string) => ({ assassin: '暗影步：移动路径可穿过敌我单位，但不能停在被占格。', 'raider-cavalry': '骑兵本能：基础移动力已包含 +1；每次攻击后本回合额外获得 +1 移动力，可叠加。', crossbowman: '重弩装填：普通攻击伤害翻倍；攻击后需冷却完整一回合。' }[professionId] ?? '该职业暂未配置专属被动。')
  const skillName = (id: string) => skillById(id)?.name ?? id
  const skillDetail = (id: string) => { const skill = skillById(id); if (!skill) return ''; const effectName = ({ evasion: '回避', defense: '伤害减免', regeneration: '每回合再生', shield: '护盾', lifesteal: '吸血', immunity: '免疫', damage: '伤害', heal: '治疗', buff: '强化', bleed: '持续伤害' } as const)[skill.effect]; const action = skill.effect === 'damage' ? `造成攻击力 + ${skill.value} 的伤害` : skill.effect === 'bleed' ? `附加 ${skill.value} 点持续伤害，持续 ${skill.duration ?? 1} 回合` : skill.effect === 'heal' ? `恢复 ${skill.value} 点生命` : skill.effect === 'buff' ? `获得 ${skill.value} 点护盾` : `提供 ${skill.value}${skill.effect === 'evasion' || skill.effect === 'lifesteal' ? '%' : ' 点'}${effectName}`; const category = skill.kind === 'passive' ? '天赋' : skill.slot === 'main' ? '核心技' : '战术技'; return `${category}；${action}。` }
  const heroAttributeSummary = (hero: TacticsHero) => { const profession = professionById(hero.professionId); const passiveIds = [profession?.passiveSkillId, ...hero.learnedSkillIds].filter((id): id is string => Boolean(id)); const effects = passiveIds.map(skillById).filter((skill) => skill?.kind === 'passive'); const total = (effect: string) => effects.filter((skill) => skill?.effect === effect).reduce((sum, skill) => sum + (skill?.value ?? 0), 0); const energy = profession?.energy; const a = hero.attributes; return [{ label: '力量', value: a.strength }, { label: '技巧', value: a.technique }, { label: '敏捷', value: a.agility }, { label: '体质', value: a.constitution }, { label: '感知', value: a.perception }, { label: '意志', value: a.willpower }, { label: '生命', value: hero.stats.maxHp }, { label: '移动', value: `${hero.stats.move} 格` }, { label: '攻击范围', value: `${hero.stats.range} 格` }, { label: '移动次数', value: hero.stats.actions.move }, { label: '攻击次数', value: hero.stats.actions.attack }, { label: energy?.name ?? '能量', value: `${energy?.max ?? 0} 点` }, { label: '闪避减伤', value: `${a.agility + total('evasion')}%` }, { label: '护盾上限', value: total('shield') }, { label: '再生', value: `${total('regeneration')} / 回合` }, { label: '吸血', value: `${total('lifesteal')}%` }, { label: '免疫次数', value: total('immunity') }]
  }
  const learnSkill = (hero: TacticsHero, skillId: string) => { save.value = learnDraftSkill(save.value, hero.id, skillId); message.value = `${hero.name} 学会了 ${skillName(skillId)}。` }
  const equipSkill = (hero: TacticsHero, skillId: string) => { save.value = equipHeroSkill(save.value, hero.id, skillId); message.value = `${hero.name} 已装备 ${skillName(skillId)}。` }
  watch(save, (value) => tacticsStore.save(value), { deep: true })
  return { save, message, customName, customColor, battle, selectedUnit, inspectedUnit, detailHero, cells, movableKeys, attackableIds, moveAttackByTarget, hpPercent, statText, actionText, estimatedDamage, activeSkills, pendingSkillId, prepareSkill, zoomBoard, zoomBoardWithWheel, boardZoom, boardPan, setBoardScroll, beginBoardPan, moveBoardPan, endBoardPan, inspectUnit, openHeroDetail, closeHeroDetail, heroAttributeSummary, handleCell, startBattle, finishTurn, claimRewards, resetRun, train, addHero, learnSkill, equipSkill, professionName, professionPassiveDetail, skillName, skillDetail, beginDrag, updateDrag, finishDrag, cancelDrag, dragUnitId, dragPoint, dragPreview, dragLanding, dragLandingKeys, dragPathKeys, tacticsHeroCapacity }
}
