import { createCheatRuntime, type CheatRuntime, type GameCheatHooks } from './cheatRuntime'

export interface Game2048CheatAdapter extends GameCheatHooks {
  runtime: CheatRuntime
  activatePrimaryCheat: () => void
  canMergePair: (left: number, right: number) => boolean
  mergedValue: (left: number, right: number) => number
  scoreGain: (baseGain: number) => number
  resolveGameOver: (blocked: boolean) => boolean
  statusText: () => string | null
}

export const createGame2048CheatAdapter = (): Game2048CheatAdapter => {
  const runtime = createCheatRuntime({
    doubleMerge: false,
    scoreMultiplier: 1,
    invincible: false,
  })

  return {
    runtime,
    activatePrimaryCheat: () => {
      runtime.enable('doubleMerge')
    },
    canMergePair: (left, right) => {
      if (left === right) return true
      if (!runtime.isEnabled('doubleMerge')) return false
      const high = Math.max(left, right)
      const low = Math.min(left, right)
      return low * 2 === high
    },
    mergedValue: (left, right) => {
      if (left === right) return left * 2
      const high = Math.max(left, right)
      return high * 2
    },
    scoreGain: (baseGain) => baseGain * runtime.get('scoreMultiplier'),
    resolveGameOver: (blocked) => (runtime.isEnabled('invincible') ? false : blocked),
    statusText: () => (runtime.isEnabled('doubleMerge') ? '作弊已启用：差一倍可合成' : null),
    onGameStart: () => {
      runtime.reset()
    },
    onTurnResolve: () => {
      // reserved for future cheat effects
    },
    onGameOver: () => {
      // reserved for future cheat effects
    },
    onRestart: () => {
      runtime.reset()
    },
  }
}
