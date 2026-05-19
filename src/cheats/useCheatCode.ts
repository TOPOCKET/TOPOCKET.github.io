import { onBeforeUnmount, onMounted, toValue, watch, type MaybeRefOrGetter } from 'vue'

interface UseCheatCodeOptions {
  code: string
  onMatch: () => void
  scope?: boolean | (() => boolean)
  resetOn?: MaybeRefOrGetter<unknown>
}

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable
}

export const useCheatCode = (options: UseCheatCodeOptions) => {
  const normalizedCode = options.code.trim().toLowerCase()
  let buffer = ''

  const clearBuffer = () => {
    buffer = ''
  }

  const isInScope = () =>
    typeof options.scope === 'function' ? options.scope() : (options.scope ?? true)

  const onKeyDown = (event: KeyboardEvent) => {
    if (!isInScope()) return
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (isEditableTarget(event.target)) return

    if (event.key === 'Enter') {
      if (buffer === normalizedCode) {
        options.onMatch()
        event.preventDefault()
      }
      clearBuffer()
      return
    }

    if (event.key.length !== 1) return
    buffer = (buffer + event.key.toLowerCase()).slice(-normalizedCode.length)
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown, { passive: false })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown)
    clearBuffer()
  })

  if (options.resetOn) {
    watch(
      () => toValue(options.resetOn),
      () => {
        clearBuffer()
      },
    )
  }
}
