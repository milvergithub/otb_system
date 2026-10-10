/**
 * Vitest setup.
 *
 * Node 22+ ships an experimental `localStorage` global that is `undefined`
 * unless the process is started with `--localstorage-file`, and it shadows the
 * one jsdom provides. The app keeps its auth tokens and language preference in
 * `localStorage`, so tests need a working implementation.
 *
 * When jsdom's storage is reachable we use it; otherwise we install a small
 * in-memory `Storage` with the same semantics.
 */
function installMemoryStorage(): void {
  const entries = new Map<string, string>()

  const storage: Storage = {
    get length() {
      return entries.size
    },
    key: (index: number) => [...entries.keys()][index] ?? null,
    getItem: (key: string) => (entries.has(key) ? (entries.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      entries.set(String(key), String(value))
    },
    removeItem: (key: string) => {
      entries.delete(key)
    },
    clear: () => {
      entries.clear()
    },
  }

  for (const target of [globalThis, globalThis.window]) {
    if (!target) continue
    Object.defineProperty(target, "localStorage", {
      value: storage,
      configurable: true,
      writable: true,
    })
  }
}

if (typeof globalThis.localStorage === "undefined") {
  installMemoryStorage()
}
