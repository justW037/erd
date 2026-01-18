/**
 * History Panel Component (Task 43 & 44)
 *
 * Displays a list of diagram snapshots and allows diffing between them.
 */

import React, { memo, useState, useMemo } from 'react'
import type { VersionHistory, Snapshot } from '../../core/graph/types'
import { diffSchemas } from '../../core/utils/schemaDiff'

interface HistoryPanelProps {
  history: VersionHistory
  onRestore: (snapshot: Snapshot) => void
  onDelete: (id: string) => void
  onSave: (name: string, summary: string) => void
}

export const HistoryPanel: React.FC<HistoryPanelProps> = memo(({
  history,
  onRestore,
  onDelete,
  onSave,
}) => {
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [selectedSnapshotIds, setSelectedSnapshotIds] = useState<string[]>([])
  const [showDiff, setShowDiff] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave(name, summary)
    setName('')
    setSummary('')
    setIsSaving(false)
  }

  const toggleSnapshotSelection = (id: string) => {
    setSelectedSnapshotIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((sid) => sid !== id)
      }
      if (prev.length >= 2) {
        return [prev[0], id]
      }
      return [...prev, id]
    })
  }

  const comparison = useMemo(() => {
    if (selectedSnapshotIds.length !== 2) return null
    const s1 = history.snapshots.find((s) => s.id === selectedSnapshotIds[0])
    const s2 = history.snapshots.find((s) => s.id === selectedSnapshotIds[1])
    if (!s1 || !s2 || !s1.schema || !s2.schema) return null
    
    const [older, newer] = s1.timestamp < s2.timestamp ? [s1, s2] : [s2, s1]
    if (!older.schema || !newer.schema) return null
    
    return {
      oldName: older.name,
      newName: newer.name,
      diff: diffSchemas(older.schema, newer.schema)
    }
  }, [selectedSnapshotIds, history.snapshots])

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Save snapshot section */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0">
        {!isSaving ? (
          <button
            onClick={() => setIsSaving(true)}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Snapshot
          </button>
        ) : (
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label htmlFor="snapshot-name" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Name
              </label>
              <input
                id="snapshot-name"
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Initial project structure..."
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-200"
              />
            </div>
            <div>
              <label htmlFor="snapshot-summary" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Summary (optional)
              </label>
              <textarea
                id="snapshot-summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Added users table and relations..."
                rows={2}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-none dark:text-slate-200"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsSaving(false)}
                className="flex-1 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-1 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
              >
                Save
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Snapshot list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {history.snapshots.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No snapshots yet</p>
            <p className="text-xs text-slate-400 mt-1">Snapshots let you save and restore project versions.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {history.snapshots.map((snapshot) => (
              <div 
                key={snapshot.id} 
                className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors group relative ${
                  selectedSnapshotIds.includes(snapshot.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                }`}
              >
                <div className="flex gap-3">
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      checked={selectedSnapshotIds.includes(snapshot.id)}
                      onChange={() => toggleSnapshotSelection(snapshot.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate pr-2">
                        {snapshot.name}
                      </h4>
                      <button
                        onClick={() => onDelete(snapshot.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all rounded"
                        title="Delete snapshot"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2 italic">
                      {snapshot.summary || 'No summary provided.'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        {new Date(snapshot.timestamp).toLocaleString()}
                      </span>
                      <button
                        onClick={() => onRestore(snapshot)}
                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Restore
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comparison Drawer/Footer */}
      {selectedSnapshotIds.length > 0 && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg shrink-0">
          {selectedSnapshotIds.length === 1 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">
              Select one more snapshot to compare
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  2 snapshots selected
                </span>
                <button
                  onClick={() => setSelectedSnapshotIds([])}
                  className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 uppercase font-bold"
                >
                  Clear
                </button>
              </div>
              <button
                onClick={() => setShowDiff(true)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Compare Versions
              </button>
            </div>
          )}
        </div>
      )}

      {/* Diff Modal Overlay */}
      {showDiff && comparison && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Comparing Snapshots</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">{comparison.oldName}</span>
                  <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">{comparison.newName}</span>
                </p>
              </div>
              <button
                onClick={() => setShowDiff(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l18 18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Tables Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tables</h4>
                <div className="space-y-3">
                  {!comparison.diff.hasChanges ? (
                    <p className="text-sm text-slate-400 italic py-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-lg">No changes detected between these snapshots.</p>
                  ) : (
                    comparison.diff.tables.filter(t => t.action !== 'unchanged').map(table => (
                      <div key={table.name} className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden">
                        <div className={`px-3 py-2 text-sm font-semibold flex items-center justify-between ${
                          table.action === 'added' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                          table.action === 'removed' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                          'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-sm uppercase font-bold tracking-tighter opacity-80 border border-current">
                              {table.action}
                            </span>
                            {table.name}
                          </div>
                        </div>
                        {table.columnDiffs.some(c => c.action !== 'unchanged') && (
                          <div className="p-2 space-y-1 bg-white dark:bg-slate-900/50">
                            {table.columnDiffs.filter(c => c.action !== 'unchanged').map(col => (
                              <div key={col.name} className="text-xs flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800">
                                <span className={
                                  col.action === 'added' ? 'text-green-500' :
                                  col.action === 'removed' ? 'text-red-500' :
                                  'text-blue-500'
                                }>
                                  {col.action === 'added' ? '+' : col.action === 'removed' ? '-' : '•'}
                                </span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">{col.name}</span>
                                <span className="text-slate-400">:</span>
                                <span className="text-slate-500">
                                  {col.action === 'added' ? col.newType :
                                   col.action === 'removed' ? col.oldType :
                                   <span className="flex items-center gap-1">
                                     <span className="line-through opacity-50">{col.oldType}</span>
                                     <svg className="w-2.5 h-2.5 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                     </svg>
                                     <span className="font-bold">{col.newType}</span>
                                   </span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Relations Section */}
              {comparison.diff.relations.some(r => r.action !== 'unchanged') && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Relations</h4>
                  <div className="space-y-2">
                    {comparison.diff.relations.map(rel => rel.action !== 'unchanged' && (
                      <div key={rel.id} className={`text-xs p-2 rounded-md flex items-center gap-3 ${
                        rel.action === 'added' ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300' :
                        'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300'
                      }`}>
                         <span className="uppercase font-bold tracking-tighter opacity-70 border border-current px-1 rounded-sm scale-75 origin-left shrink-0">
                            {rel.action}
                         </span>
                         <span className="font-mono truncate">{rel.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end shrink-0">
                <button
                  onClick={() => setShowDiff(false)}
                  className="px-6 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
                >
                  Close
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

HistoryPanel.displayName = 'HistoryPanel'
