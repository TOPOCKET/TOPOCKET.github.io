import { describe, expect, it } from 'vitest'
import { createInitialTacticsSave, startTacticsBattle } from '../engine/tactics-engine'
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
        { id: 'unit-hero-vanguard', side: 'player', heroId: 'hero-vanguard', name: '先锋', color: '#60a5fa', x: 0, y: 0, hp: 24, stats: { maxHp: 24, atk: 7, def: 2, move: 3, range: 1, actions: { move: 1, attack: 1 } }, moved: 0, attacked: 0 },
        { id: 'enemy-1', side: 'enemy', name: '敌人', color: '#f97316', x: 7, y: 7, hp: 10, stats: { maxHp: 10, atk: 4, def: 0, move: 2, range: 1, actions: { move: 1, attack: 1 } }, moved: 0, attacked: 0 },
      ],
    }
    expect(tacticsSaveSchema.safeParse(save).success).toBe(false)
  })

  it('rejects duplicate living unit positions and out-of-board coordinates', () => {
    const save = createInitialTacticsSave()
    save.battle = {
      id: 'battle-1', stage: 1, width: 4, height: 4, turn: 'player', round: 1, status: 'fighting', selectedUnitId: null, log: [],
      units: [
        { id: 'unit-hero-vanguard', side: 'player', heroId: 'hero-vanguard', name: '先锋', color: '#60a5fa', x: 0, y: 0, hp: 24, stats: { maxHp: 24, atk: 7, def: 2, move: 3, range: 1, actions: { move: 1, attack: 1 } }, moved: 0, attacked: 0 },
        { id: 'enemy-1', side: 'enemy', name: '敌人', color: '#f97316', x: 0, y: 0, hp: 10, stats: { maxHp: 10, atk: 4, def: 0, move: 2, range: 1, actions: { move: 1, attack: 1 } }, moved: 0, attacked: 0 },
      ],
    }
    expect(tacticsSaveSchema.safeParse(save).success).toBe(false)
    save.battle.units[1].x = 4
    expect(tacticsSaveSchema.safeParse(save).success).toBe(false)
  })

  it('migrates legacy acted unit state and rejects action counts over their limits', () => {
    const started = createInitialTacticsSave()
    started.battle = {
      id: 'legacy', stage: 1, width: 4, height: 4, turn: 'player', round: 1, status: 'fighting', selectedUnitId: null, log: [],
      units: [{ id: 'unit-hero-vanguard', side: 'player', heroId: 'hero-assassin', name: '刺客', color: '#a78bfa', x: 0, y: 0, hp: started.heroes[0].stats.maxHp, stats: { ...started.heroes[0].stats }, moved: 0, attacked: 0 }],
    }
    const legacy = structuredClone(started) as unknown as { version: number, heroes: Array<{ stats: Record<string, unknown> }>, battle: { units: Array<Record<string, unknown>> } }
    legacy.version = 1
    for (const hero of legacy.heroes) delete hero.stats.actions
    for (const unit of legacy.battle.units) { delete unit.moved; delete unit.attacked; unit.acted = true; delete (unit.stats as Record<string, unknown>).actions }
    expect(tacticsSaveSchema.parse(legacy).battle?.units[0]).toMatchObject({ moved: 1, attacked: 1 })
    const invalid = createInitialTacticsSave(); invalid.battle = structuredClone(started.battle); invalid.battle!.units[0].moved = 2
    expect(tacticsSaveSchema.safeParse(invalid).success).toBe(false)
  })

  it('keeps profession combat fields when loading an in-progress battle', () => {
    const started = startTacticsBattle(createInitialTacticsSave())
    const parsed = tacticsSaveSchema.parse(started)
    const assassin = parsed.battle!.units.find((unit) => unit.heroId === 'hero-assassin')!
    expect(assassin).toMatchObject({ professionId: 'assassin', equippedCoreSkillId: 'assassin-core-single', energy: { name: '体力', current: 5 } })
    expect(assassin.learnedSkillIds).toEqual(expect.arrayContaining(['assassin-tactic-bleed', 'assassin-passive-guard']))
  })
})
