const mem = new Map<string, string>()

const localStorageMock: Storage = {
  get length() {
    return mem.size
  },
  clear() {
    mem.clear()
  },
  getItem(key: string) {
    return mem.has(key) ? mem.get(key)! : null
  },
  key(index: number) {
    return [...mem.keys()][index] ?? null
  },
  removeItem(key: string) {
    mem.delete(key)
  },
  setItem(key: string, value: string) {
    mem.set(key, String(value))
  },
}

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true })
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true })
if (!('navigator' in globalThis)) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: true, userAgent: 'test' },
    configurable: true,
  })
}
