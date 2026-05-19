export interface CheatFlags {
  doubleMerge: boolean
  scoreMultiplier: number
  invincible: boolean
}

export type CheatKey = keyof CheatFlags

export interface GameCheatHooks {
  onGameStart: () => void
  onTurnResolve: () => void
  onGameOver: () => void
  onRestart: () => void
}

export interface CheatRuntime {
  enable: (key: CheatKey) => void
  disable: (key: CheatKey) => void
  reset: () => void
  isEnabled: (key: CheatKey) => boolean
  get: <K extends CheatKey>(key: K) => CheatFlags[K]
  set: <K extends CheatKey>(key: K, value: CheatFlags[K]) => void
  snapshot: () => CheatFlags
}

export const createCheatRuntime = (defaults?: Partial<CheatFlags>): CheatRuntime => {
  const initial: CheatFlags = {
    doubleMerge: defaults?.doubleMerge ?? false,
    scoreMultiplier: defaults?.scoreMultiplier ?? 1,
    invincible: defaults?.invincible ?? false,
  }

  let state: CheatFlags = { ...initial }

  return {
    enable: (key) => {
      if (typeof state[key] === 'boolean') {
        state = { ...state, [key]: true }
      }
    },
    disable: (key) => {
      if (typeof state[key] === 'boolean') {
        state = { ...state, [key]: false }
      }
    },
    reset: () => {
      state = { ...initial }
    },
    isEnabled: (key) => state[key] === true,
    get: (key) => state[key],
    set: (key, value) => {
      state = { ...state, [key]: value }
    },
    snapshot: () => ({ ...state }),
  }
}
