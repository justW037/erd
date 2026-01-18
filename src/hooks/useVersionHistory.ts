/**
 * Version History Hook (Task 43)
 *
 * Manages snapshots of the diagram state.
 */

import { useState, useCallback, useEffect } from 'react'
import type { Graph, Snapshot, VersionHistory } from '../core/graph/types'
import type { DatabaseSchema } from '../core/ir/types'

const HISTORY_KEY = 'erd_version_history'

export function useVersionHistory(
  dsl: string,
  graph: Graph,
  schema?: DatabaseSchema
) {
  const [history, setHistory] = useState<VersionHistory>(() => {
    const stored = localStorage.getItem(HISTORY_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (e) {
        console.error('Failed to parse version history', e)
      }
    }
    return { snapshots: [] }
  })

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  }, [history])

  const saveSnapshot = useCallback((name: string, summary: string) => {
    const newSnapshot: Snapshot = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      name,
      summary,
      dsl,
      graph: JSON.parse(JSON.stringify(graph)), // Deep clone
      schema: schema ? JSON.parse(JSON.stringify(schema)) : undefined,
    }

    setHistory(prev => ({
      ...prev,
      snapshots: [newSnapshot, ...prev.snapshots].slice(0, 50), // Keep last 50
    }))

    return newSnapshot
  }, [dsl, graph, schema])

  const deleteSnapshot = useCallback((id: string) => {
    setHistory(prev => ({
      ...prev,
      snapshots: prev.snapshots.filter(s => s.id !== id),
      currentId: prev.currentId === id ? undefined : prev.currentId,
    }))
  }, [])

  const clearHistory = useCallback(() => {
    setHistory({ snapshots: [] })
  }, [])

  return {
    history,
    saveSnapshot,
    deleteSnapshot,
    clearHistory,
  }
}
