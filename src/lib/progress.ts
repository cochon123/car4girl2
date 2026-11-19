import { useSyncExternalStore } from 'react'

const KEY = 'c4g2.done'
const listeners = new Set<() => void>()

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    const v = raw ? JSON.parse(raw) : []
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

let snapshot = read()

export function markDone(slug: string) {
  if (snapshot.includes(slug)) return
  snapshot = [...snapshot, slug]
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot))
  } catch {
    /* storage unavailable: keep it in memory for this visit */
  }
  listeners.forEach((l) => l())
}

export function useDone() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => snapshot,
    () => snapshot,
  )
}
