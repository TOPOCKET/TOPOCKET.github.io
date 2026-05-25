import { onMounted, onUnmounted } from 'vue'

interface InputShortcutConfig {
  selector: string
  ctrlKey?: boolean
  key: string
}

export const useInputShortcut = (config: InputShortcutConfig) => {
  const onKeydown = (event: KeyboardEvent) => {
    const needCtrl = config.ctrlKey ?? false
    if (!!event.ctrlKey !== needCtrl) return
    if (event.key !== config.key) return
    event.preventDefault()
    const input = document.querySelector<HTMLInputElement>(config.selector)
    input?.focus()
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
}
