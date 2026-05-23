/**
 * @file game2048Cheats 文件说明。
 * @description 小游戏作弊码识别与作弊状态运行时控制。
 */
import { createCheatRuntime, type CheatRuntime, type GameCheatHooks } from './cheatRuntime'

/**
 * Game2048CheatAdapter 接口定义。
 * @remarks 该接口用于跨模块数据交换，字段变更需同步校验层与持久化层。
 */
export interface Game2048CheatAdapter extends GameCheatHooks {
  runtime: CheatRuntime
  activatePrimaryCheat: () => void
  canMergePair: (left: number, right: number) => boolean
  mergedValue: (left: number, right: number) => number
  scoreGain: (baseGain: number) => number
  resolveGameOver: (blocked: boolean) => boolean
  statusText: () => string | null
}

/**
 * createGame2048CheatAdapter：创建并返回业务实例。
 * @return 返回创建后的实例或结果对象。
 * @remarks 该函数属于公共导出能力，修改行为时需同步更新调用方、测试与文档。
 */
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
