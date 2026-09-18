import type { TacticsHero, TacticsSave, TacticsStats } from '../model/tactics-model'
import { professionById, professionSkillIds } from './tactics-professions'

export const tacticsBoardSize = 35

const makeHero = (id: string, name: string, color: string, stats: TacticsStats, professionId = 'adept', learnedSkillIds: string[] = professionSkillIds(professionId)): TacticsHero => ({
  id, name, color, level: 1, xp: 0, training: 0, stats, professionId, attributes: { ...(professionById(professionId)?.initialAttributes ?? { strength: 5, technique: 5, agility: 5, constitution: 5, perception: 5, willpower: 5 }) }, learnedSkillIds, equippedCoreSkillId: learnedSkillIds.find((id) => id.includes('-core-single')) ?? null, equippedTacticalSkillIds: learnedSkillIds.filter((id) => id.includes('-tactic-')).slice(0, 3), skillDraft: null,
})

export const createInitialTacticsSave = (): TacticsSave => ({
  version: 7,
  stage: 1,
  supplies: 0,
  heroes: [
    makeHero('hero-assassin', '刺客', '#a78bfa', { maxHp: 18, atk: 7, def: 0, move: 4, range: 1, actions: { move: 1, attack: 1 } }, 'assassin'),
    makeHero('hero-raider', '掠袭骑兵', '#34d399', { maxHp: 22, atk: 6, def: 1, move: 5, range: 2, actions: { move: 1, attack: 1 } }, 'raider-cavalry'),
    makeHero('hero-crossbow', '重弩手', '#f59e0b', { maxHp: 20, atk: 8, def: 2, move: 2, range: 3, actions: { move: 1, attack: 1 } }, 'crossbowman'),
    makeHero('hero-arcanist', '奥术术士', '#60a5fa', { maxHp: 18, atk: 5, def: 1, move: 3, range: 3, actions: { move: 1, attack: 1 } }, 'arcanist'),
    makeHero('hero-medic', '灵能医师', '#c084fc', { maxHp: 22, atk: 4, def: 1, move: 3, range: 3, actions: { move: 1, attack: 1 } }, 'psionic-medic'),
    makeHero('hero-templar', '圣堂卫士', '#fef3c7', { maxHp: 28, atk: 6, def: 3, move: 3, range: 1, actions: { move: 1, attack: 1 } }, 'templar-guard'),
  ],
  battle: null,
})

export const enemyCountForStage = (stage: number) => Math.min(6, 2 + Math.floor(stage / 2))

export const enemyStatsForStage = (stage: number): TacticsStats => ({
  maxHp: 10 + stage * 3,
  atk: 4 + Math.floor(stage * 0.8),
  def: Math.floor(stage / 3),
  move: 2,
  range: 1,
  actions: { move: 1, attack: 1 },
})

export const createCustomHero = (id: string, name: string, color: string): TacticsHero =>
  makeHero(id, name, color, { maxHp: 20, atk: 6, def: 1, move: 3, range: 1, actions: { move: 1, attack: 1 } })
