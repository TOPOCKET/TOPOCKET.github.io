import { describe, expect, it } from 'vitest'
import { attackWithSelectedUnit, claimVictoryRewards, createInitialTacticsSave, startTacticsBattle } from './tactics-engine'

describe('tactics engine', () => {
  it('starts a battle with player and enemy units', () => {
    const save = startTacticsBattle(createInitialTacticsSave())
    expect(save.battle?.units.some((unit) => unit.side === 'player')).toBe(true)
    expect(save.battle?.units.some((unit) => unit.side === 'enemy')).toBe(true)
  })

  it('grants growth rewards after victory', () => {
    const save = startTacticsBattle(createInitialTacticsSave())
    const battle = save.battle!
    const player = battle.units.find((unit) => unit.side === 'player')!
    const enemy = battle.units.find((unit) => unit.side === 'enemy')!
    player.x = enemy.x - 1
    player.y = enemy.y
    player.stats.atk = 999
    battle.selectedUnitId = player.id
    battle.units = battle.units.filter((unit) => unit.side === 'player' || unit.id === enemy.id)
    const attacked = attackWithSelectedUnit(save, enemy.id).save
    const rewarded = claimVictoryRewards(attacked)
    expect(rewarded.stage).toBe(2)
    expect(rewarded.heroes[0].training).toBe(1)
  })
})
