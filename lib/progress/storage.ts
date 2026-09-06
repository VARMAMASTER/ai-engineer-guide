export function storageAvailable(): boolean {
  try {
    const k = '__aeg_probe__'
    window.localStorage.setItem(k, '1')
    window.localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

export function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage is blocked or full. State stays in memory for this session.
  }
}

export function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Same as above.
  }
}
