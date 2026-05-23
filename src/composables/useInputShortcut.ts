/**
 * @file useInputShortcut 文件说明。
 * @description 组合式复用逻辑与页面共享状态访问能力。
 */
import { onMounted, onUnmounted } from 'vue'

interface InputShortcutConfig {
  selector: string
  ctrlKey?: boolean
  key: string
}

/**
 * useInputShortcut：提供可复用组合式能力。
 * @param config 行为配置对象，用于控制数量、边界或开关。
 * @return 返回页面可消费的组合式 API。
 * @remarks 该函数属于公共导出能力，修改行为时需同步更新调用方、测试与文档。
 */
export const useInputShortcut = (config: InputShortcutConfig) => {
  const onKeydown = (event: KeyboardEvent) => {
    const needCtrl = config.ctrlKey ?? false
    if (!!event.ctrlKey !== needCtrl) return
    if (event.key !== config.key) return

    event.preventDefault()
    const input = document.querySelector<HTMLInputElement>(config.selector)
    input?.focus()
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown)
  })
}
