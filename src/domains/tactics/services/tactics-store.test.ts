import { describe, expect, it } from 'vitest'
import { createInitialTacticsSave } from '../engine/tactics-engine'
import { tacticsSaveLimits, tacticsSaveSchema } from './tactics-store'

describe('tactics save schema', () => {
  it('rejects saves over the hero capacity', () => {
    const save = createInitialTacticsSave()
    save.heroes = Array.from({ length: tacticsSaveLimits.maxHeroes + 1 }, (_, index) => ({ ...save.heroes[0], id: `hero-${index}` }))
    expect(tacticsSaveSchema.safeParse(save).success).toBe(false)
  })

  it('rejects a battle from a different stage', () => {
    const save = createInitialTacticsSave()
    save.battle = {
      id: 'battle-1', stage: 2, width: 8, height: 8, turn: 'player', round: 1, status: 'fighting', selectedUnitId: 'unit-hero-vanguard', log: [],
      units: [
        { id: 'unit-hero-vanguard', side: 'player', heroId: 'hero-vanguard', name: '先锋', color: '#60a5fa', x: 0, y: 0, hp: 24, stats: { maxHp: 24, atk: 7, def: 2, move: 3, range: 1 }, acted: false },
        { id: 'enemy-1', side: 'enemy', name: '敌人', color: '#f97316', x: 7, y: 7, hp: 10, stats: { maxHp: 10, atk: 4, def: 0, move: 2, range: 1 }, acted: false },
      ],
    }
    expect(tacticsSaveSchema.safeParse(save).success).toBe(false)
  })
})
