/**
 * CheatFlags 接口定义。
 * @remarks 该接口用于跨模块数据交换，字段变更需同步校验层与持久化层。
 */
export interface CheatFlags {
  doubleMerge: boolean
  scoreMultiplier: number
  invincible: boolean
}

/**
 * CheatKey 类型定义。
 * @remarks 该类型用于约束调用边界，变更时请检查上下游类型推断与兼容性。
 */
export type CheatKey = keyof CheatFlags

/**
 * GameCheatHooks 接口定义。
 * @remarks 该接口用于跨模块数据交换，字段变更需同步校验层与持久化层。
 */
export interface GameCheatHooks {
  onGameStart: () => void
  onTurnResolve: () => void
  onGameOver: () => void
  onRestart: () => void
}

/**
 * CheatRuntime 接口定义。
 * @remarks 该接口用于跨模块数据交换，字段变更需同步校验层与持久化层。
 */
export interface CheatRuntime {
  enable: (key: CheatKey) => void
  disable: (key: CheatKey) => void
  reset: () => void
  isEnabled: (key: CheatKey) => boolean
  get: <K extends CheatKey>(key: K) => CheatFlags[K]
  set: <K extends CheatKey>(key: K, value: CheatFlags[K]) => void
  snapshot: () => CheatFlags
}

/**
 * createCheatRuntime：创建并返回业务实例。
 * @param defaults 运行时默认配置。
 * @return 返回创建后的实例或结果对象。
 * @remarks 该函数属于公共导出能力，修改行为时需同步更新调用方、测试与文档。
 */
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
