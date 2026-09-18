import { describe, expect, it } from 'vitest'
import { addCustomHero, attackWithSelectedUnit, claimVictoryRewards, createInitialTacticsSave, endPlayerTurn, getMovableCells, getMoveThenAttackLandings, learnDraftSkill, moveSelectedUnit, moveThenAttackWithSelectedUnit, startTacticsBattle, trainHeroStat } from './tactics-engine'
import { professionSkillIds, tacticsProfessions, tacticsSkills } from '../config/tactics-professions'

describe('tactics engine', () => {
  it('starts a battle with player and enemy units', () => {
    const save = startTacticsBattle(createInitialTacticsSave())
    expect(save.battle?.units.some((unit) => unit.side === 'player')).toBe(true)
    expect(save.battle?.units.some((unit) => unit.side === 'enemy')).toBe(true)
  })

  it('gives every profession a complete two-core, four-tactical, two-passive skill library', () => {
    for (const profession of tacticsProfessions) {
      const skills = professionSkillIds(profession.id).map((id) => tacticsSkills.find((skill) => skill.id === id)!)
      expect(skills.filter((skill) => skill.slot === 'main')).toHaveLength(2)
      expect(skills.filter((skill) => skill.slot === 'secondary')).toHaveLength(4)
      expect(skills.filter((skill) => skill.slot === 'passive')).toHaveLength(2)
      expect(skills.every((skill) => skill.damageTypes?.includes(profession.damageType))).toBe(true)
    }
  })

  it('grants growth rewards after victory', () => {
    const save = startTacticsBattle(createInitialTacticsSave())
    const battle = save.battle!
    const player = battle.units.find((unit) => unit.side === 'player')!
    const enemy = battle.units.find((unit) => unit.side === 'enemy')!
    player.x = enemy.x - 1
    player.y = enemy.y
    player.stats.atk = 999; player.attributes!.strength = 999
    battle.selectedUnitId = player.id
    battle.units = battle.units.filter((unit) => unit.side === 'player' || unit.id === enemy.id)
    const attacked = attackWithSelectedUnit(save, enemy.id).save
    const rewarded = claimVictoryRewards(attacked)
    expect(rewarded.stage).toBe(2)
    expect(rewarded.heroes[0].training).toBe(1)
  })

  it('rejects an occupied or out-of-range movement without mutating the save', () => {
    const save = startTacticsBattle(createInitialTacticsSave())
    const battle = save.battle!
    battle.selectedUnitId = battle.units.find((unit) => unit.side === 'player')!.id
    const occupied = battle.units.find((unit) => unit.side === 'enemy')!
    expect(moveSelectedUnit(save, { x: occupied.x, y: occupied.y }).save).toBe(save)
    expect(moveSelectedUnit(save, { x: 7, y: 7 }).save).toBe(save)
  })

  it('advances an enemy turn and restores the player turn', () => {
    const save = startTacticsBattle(createInitialTacticsSave())
    const next = endPlayerTurn(save)
    expect(next.battle?.turn).toBe('player')
    expect(next.battle?.round).toBe(2)
    expect(next.battle?.units.filter((unit) => unit.side === 'player').every((unit) => unit.moved === 0 && unit.attacked === 0)).toBe(true)
  })

  it('does not advance a defeated battle', () => {
    const save = startTacticsBattle(createInitialTacticsSave())
    save.battle!.status = 'defeat'
    expect(endPlayerTurn(save)).toBe(save)
  })

  it('spends one training point on a valid hero stat only', () => {
    const save = createInitialTacticsSave()
    save.heroes[0].training = 1
    const trained = trainHeroStat(save, save.heroes[0].id, 'strength')
    expect(trained.heroes[0]).toMatchObject({ training: 0, level: 2 })
    expect(trained.heroes[0].attributes.strength).toBeGreaterThan(save.heroes[0].attributes.strength)
    expect(trainHeroStat(save, 'missing', 'strength')).toStrictEqual(save)
  })

  it('does not add a blank custom hero', () => {
    const save = createInitialTacticsSave()
    expect(addCustomHero(save, '   ', '#ffffff')).toBe(save)
  })

  it('uses BFS blocking instead of crossing occupied tiles', () => {
    const save = startTacticsBattle(createInitialTacticsSave())
    const battle = save.battle!; const player = battle.units.find((unit) => unit.side === 'player')!; const blocker = battle.units.find((unit) => unit.side === 'player' && unit.id !== player.id)!
    player.professionId = 'adept'; player.x = 0; player.y = 0; player.stats.move = 2; blocker.x = 1; blocker.y = 0
    expect(getMovableCells(battle, player).some((cell) => cell.x === 2 && cell.y === 0)).toBe(false)
  })

  it('lets the assassin pass through occupied units but never land on them', () => {
    const save = startTacticsBattle(createInitialTacticsSave())
    const battle = save.battle!; const assassin = battle.units.find((unit) => unit.heroId === 'hero-assassin')!; const blocker = battle.units.find((unit) => unit.side === 'player' && unit.id !== assassin.id)!
    battle.units = [assassin, blocker]; assassin.x = 0; assassin.y = 0; assassin.stats.move = 2; blocker.x = 1; blocker.y = 0
    const movable = getMovableCells(battle, assassin)
    expect(movable.some((cell) => cell.x === 2 && cell.y === 0)).toBe(true)
    expect(movable.some((cell) => cell.x === 1 && cell.y === 0)).toBe(false)
  })

  it('enforces the crossbowman full-turn reload after a doubled attack', () => {
    const save = startTacticsBattle(createInitialTacticsSave())
    const battle = save.battle!; const crossbowman = battle.units.find((unit) => unit.heroId === 'hero-crossbow')!; const enemy = battle.units.find((unit) => unit.side === 'enemy')!
    battle.units = [crossbowman, enemy]; crossbowman.x = 0; crossbowman.y = 0; enemy.x = 2; enemy.y = 0; enemy.stats.maxHp = 99; enemy.hp = 99; battle.selectedUnitId = crossbowman.id
    const fired = attackWithSelectedUnit(save, enemy.id).save
    expect(fired.battle!.units[0].attackCooldown).toBe(2)
    const reloadedOnce = endPlayerTurn(fired); reloadedOnce.battle!.selectedUnitId = crossbowman.id
    expect(attackWithSelectedUnit(reloadedOnce, enemy.id).message).toContain('冷却')
    const reloadedTwice = endPlayerTurn(reloadedOnce); reloadedTwice.battle!.selectedUnitId = crossbowman.id
    expect(reloadedTwice.battle!.units[0].attackCooldown).toBe(0)
    expect(attackWithSelectedUnit(reloadedTwice, enemy.id).message).toBe('攻击完成。')
  })

  it('can atomically move then attack and preserves separate action counters', () => {
    const save = startTacticsBattle(createInitialTacticsSave())
    const battle = save.battle!; const player = battle.units.find((unit) => unit.side === 'player')!; const enemy = battle.units.find((unit) => unit.side === 'enemy')!
    battle.units = [player, enemy]; player.x = 0; player.y = 0; player.stats.move = 3; player.stats.range = 1; enemy.x = 3; enemy.y = 0; enemy.stats.maxHp = 999; enemy.hp = 999; battle.selectedUnitId = player.id
    const result = moveThenAttackWithSelectedUnit(save, enemy.id)
    expect(result.save.battle!.units.find((unit) => unit.id === player.id)).toMatchObject({ x: 2, y: 0, moved: 1, attacked: 1 })
  })

  it('accepts a player-selected legal landing for move then attack', () => {
    const save = startTacticsBattle(createInitialTacticsSave()); const battle = save.battle!; const player = battle.units.find((unit) => unit.side === 'player')!; const enemy = battle.units.find((unit) => unit.side === 'enemy')!
    battle.units = [player, enemy]; player.x = 0; player.y = 0; player.stats.move = 4; enemy.x = 3; enemy.y = 1; enemy.stats.maxHp = 999; enemy.hp = 999; battle.selectedUnitId = player.id
    const landing = getMoveThenAttackLandings(battle, player, enemy.id).find((cell) => cell.x === 3 && cell.y === 0)!
    expect(moveThenAttackWithSelectedUnit(save, enemy.id, landing).save.battle!.units.find((unit) => unit.id === player.id)).toMatchObject({ x: 3, y: 0 })
  })

  it('allows configured repeated actions and forbids actions after defeat', () => {
    const save = startTacticsBattle(createInitialTacticsSave()); const battle = save.battle!; const player = battle.units.find((unit) => unit.side === 'player')!
    player.stats.actions.move = 2; battle.units = battle.units.filter((unit) => unit.side === 'player'); battle.selectedUnitId = player.id
    const once = moveSelectedUnit(save, { x: 1, y: 1 }).save
    expect(moveSelectedUnit(once, { x: 2, y: 1 }).save.battle!.units.find((unit) => unit.id === player.id)?.moved).toBe(2)
    once.battle!.status = 'defeat'
    expect(moveSelectedUnit(once, { x: 2, y: 1 }).save).toBe(once)
  })

  it('offers four weighted skills on growth and persists the chosen one', () => {
    const save = createInitialTacticsSave(); save.heroes[0].training = 1
    const grown = trainHeroStat(save, save.heroes[0].id, 'strength'); const draft = grown.heroes[0].skillDraft!
    expect(draft).toHaveLength(4)
    expect(learnDraftSkill(grown, grown.heroes[0].id, draft[0]).heroes[0]).toMatchObject({ skillDraft: null })
    expect(learnDraftSkill(grown, grown.heroes[0].id, draft[0]).heroes[0].learnedSkillIds).toContain(draft[0])
  })
})
