import { createCustomHero } from '../config/tactics-balance'
import type { TacticsSave, TacticsStats } from '../model/tactics-model'
import { professionById, skillWeight, tacticsSkills } from '../config/tactics-professions'

export const tacticsHeroCapacity = 12

export const claimVictoryRewards = (save: TacticsSave): TacticsSave => {
  if (!save.battle || save.battle.status !== 'victory') return save
  const xpGain = 8 + save.stage * 2
  return {
    ...save,
    stage: save.stage + 1,
    supplies: save.supplies + 2 + save.stage,
    battle: null,
    heroes: save.heroes.map((hero) => ({ ...hero, xp: hero.xp + xpGain, training: hero.training + 1 })),
  }
}

export const trainHeroStat = (save: TacticsSave, heroId: string, stat: keyof Pick<TacticsStats, 'maxHp' | 'atk' | 'def'>): TacticsSave => ({
  ...save,
  heroes: save.heroes.map((hero) => {
    if (hero.id !== heroId || hero.training <= 0) return hero
    const gain = stat === 'maxHp' ? 3 : 1
    const profession = professionById(hero.professionId)
    const skillDraft = profession ? tacticsSkills.filter((skill) => skill.baseWeight > 0 && !hero.learnedSkillIds.includes(skill.id)).sort((a, b) => skillWeight(profession, b) - skillWeight(profession, a) || a.id.localeCompare(b.id)).slice(0, 4).map((skill) => skill.id) : []
    return { ...hero, level: hero.level + 1, training: hero.training - 1, stats: { ...hero.stats, [stat]: hero.stats[stat] + gain }, skillDraft: skillDraft.length ? skillDraft : null }
  }),
})

export const learnDraftSkill = (save: TacticsSave, heroId: string, skillId: string): TacticsSave => ({ ...save, heroes: save.heroes.map((hero) => hero.id === heroId && hero.skillDraft?.includes(skillId) ? { ...hero, learnedSkillIds: [...hero.learnedSkillIds, skillId], skillDraft: null } : hero) })
export const equipHeroSkill = (save: TacticsSave, heroId: string, skillId: string): TacticsSave => ({ ...save, heroes: save.heroes.map((hero) => { if (hero.id !== heroId || !hero.learnedSkillIds.includes(skillId)) return hero; const skill = tacticsSkills.find((item) => item.id === skillId); if (skill?.slot === 'main') return { ...hero, equippedCoreSkillId: skillId }; if (skill?.slot === 'secondary') return { ...hero, equippedTacticalSkillIds: [...hero.equippedTacticalSkillIds.filter((id) => id !== skillId), skillId].slice(-3) }; return hero }) })

export const addCustomHero = (save: TacticsSave, name: string, color: string): TacticsSave => {
  const trimmed = name.trim()
  if (!trimmed || save.heroes.length >= tacticsHeroCapacity) return save
  const id = `hero-${Date.now()}`
  return { ...save, heroes: [...save.heroes, createCustomHero(id, trimmed.slice(0, 8), color)] }
}
