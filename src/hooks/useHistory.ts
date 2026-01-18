/**
 * Undo/Redo History Manager
 *
 * Generic history stack for managing state changes.
 * Supports undo, redo, and batching of operations.
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

export interface HistoryActions<T> {
  set: (newState: T) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  clear: () => void
  go: (index: number) => void
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useMemo } from 'react'

const MAX_HISTORY_SIZE = 100

export function useHistory<T>(initialState: T): [T, HistoryActions<T>] {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  })

  const set = useCallback((newState: T) => {
    setHistory((prev) => {
      // Don't add to history if state hasn't changed
      if (JSON.stringify(prev.present) === JSON.stringify(newState)) {
        return prev
      }

      const newPast = [...prev.past, prev.present].slice(-MAX_HISTORY_SIZE)
      return {
        past: newPast,
        present: newState,
        future: [], // Clear future on new action
      }
    })
  }, [])

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev

      const newPast = [...prev.past]
      const newPresent = newPast.pop()!
      const newFuture = [prev.present, ...prev.future]

      return {
        past: newPast,
        present: newPresent,
        future: newFuture,
      }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev

      const newFuture = [...prev.future]
      const newPresent = newFuture.shift()!
      const newPast = [...prev.past, prev.present]

      return {
        past: newPast,
        present: newPresent,
        future: newFuture,
      }
    })
  }, [])

  const clear = useCallback(() => {
    setHistory((prev) => ({
      past: [],
      present: prev.present,
      future: [],
    }))
  }, [])

  const go = useCallback((index: number) => {
    setHistory((prev) => {
      if (index === 0) return prev

      if (index < 0) {
        // Go back
        const steps = Math.min(Math.abs(index), prev.past.length)
        if (steps === 0) return prev

        const newPast = prev.past.slice(0, -steps)
        const movedToPast = prev.past.slice(-steps)
        const newPresent = movedToPast[0]
        const newFuture = [...movedToPast.slice(1), prev.present, ...prev.future]

        return { past: newPast, present: newPresent, future: newFuture }
      } else {
        // Go forward
        const steps = Math.min(index, prev.future.length)
        if (steps === 0) return prev

        const newFuture = prev.future.slice(steps)
        const movedToFuture = prev.future.slice(0, steps)
        const newPresent = movedToFuture[movedToFuture.length - 1]
        const newPast = [...prev.past, prev.present, ...movedToFuture.slice(0, -1)]

        return { past: newPast, present: newPresent, future: newFuture }
      }
    })
  }, [])

  const actions = useMemo<HistoryActions<T>>(
    () => ({
      set,
      undo,
      redo,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      clear,
      go,
    }),
    [set, undo, redo, history.past.length, history.future.length, clear, go]
  )

  return [history.present, actions]
}

// ─────────────────────────────────────────────────────────────
// Keyboard shortcuts hook
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react'

export function useHistoryKeyboard<T>(actions: HistoryActions<T>): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const modKey = isMac ? e.metaKey : e.ctrlKey

      if (modKey && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          actions.redo()
        } else {
          actions.undo()
        }
      }

      if (modKey && e.key === 'y') {
        e.preventDefault()
        actions.redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [actions])
}
