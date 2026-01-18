/**
 * Sidebar Component
 *
 * Left sidebar with schema tree, import options, and settings.
 */

import React, { memo, useState, useCallback } from 'react'
import type { DatabaseSchema } from '../../core/ir/types'
import type { Graph, TableNode, Snapshot, VersionHistory, TableGroup } from '../../core/graph/types'
import { ImportPanel } from './ImportPanel'
import { HistoryPanel } from './HistoryPanel'
import CodeMirror from '@uiw/react-codemirror'
import { dslLanguage } from '../../core/parser/dslLanguage'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { EditorView, Decoration, type DecorationSet, gutter, GutterMarker } from '@codemirror/view'
import { StateField, StateEffect } from '@codemirror/state'
import { useMemo } from 'react'

// ─────────────────────────────────────────────────────────────
// Tab Button
// ─────────────────────────────────────────────────────────────

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

const TabButton: React.FC<TabButtonProps> = memo(({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex-1 py-2 text-center transition-colors ${
      active
        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 border-b-2 border-transparent'
    }`}
    title={label}
    aria-label={label}
    aria-selected={active}
    role="tab"
  >
    {icon}
  </button>
))

TabButton.displayName = 'TabButton'

// ─────────────────────────────────────────────────────────────
// Group Color Options
// ─────────────────────────────────────────────────────────────

const GROUP_COLOR_OPTIONS = [
  { value: '#64748b', label: 'Slate' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
]

// ─────────────────────────────────────────────────────────────
// Schema Tree
// ─────────────────────────────────────────────────────────────

interface SchemaTreeProps {
  graph: Graph
  selectedNodes: Set<string>
  selectedGroups?: Set<string>
  onSelectNode: (nodeId: string) => void
  onSelectGroup?: (groupId: string) => void
  onCreateGroup?: (name: string, nodeIds: string[], color?: string) => void
  onDeleteGroup?: (groupId: string) => void
  onAddToGroup?: (groupId: string, nodeIds: string[]) => void
  onRemoveFromGroup?: (groupId: string, nodeIds: string[]) => void
  onToggleGroupCollapse?: (groupId: string) => void
}

const ROW_HEIGHT = 36
const VIRTUALIZATION_THRESHOLD = 200

const SchemaTree: React.FC<SchemaTreeProps> = memo(
  ({
    graph,
    selectedNodes,
    selectedGroups = new Set(),
    onSelectNode,
    onSelectGroup,
    onCreateGroup,
    onDeleteGroup,
    onAddToGroup,
    onRemoveFromGroup,
    onToggleGroupCollapse,
  }) => {
    const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
      new Set(graph.groups?.map((g) => g.id) || [])
    )
    const [scrollTop, setScrollTop] = useState(0)
    const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false)
    const [newGroupName, setNewGroupName] = useState('')
    const [newGroupColor, setNewGroupColor] = useState('#3b82f6')

    const toggleExpand = useCallback((tableId: string) => {
      setExpandedTables((prev) => {
        const next = new Set(prev)
        if (next.has(tableId)) {
          next.delete(tableId)
        } else {
          next.add(tableId)
        }
        return next
      })
    }, [])

    const toggleGroupExpand = useCallback((groupId: string) => {
      setExpandedGroups((prev) => {
        const next = new Set(prev)
        if (next.has(groupId)) {
          next.delete(groupId)
        } else {
          next.add(groupId)
        }
        return next
      })
    }, [])

    const handleCreateGroup = useCallback(() => {
      if (!newGroupName.trim() || selectedNodes.size === 0) return
      onCreateGroup?.(newGroupName.trim(), Array.from(selectedNodes), newGroupColor)
      setNewGroupName('')
      setShowCreateGroupDialog(false)
    }, [newGroupName, newGroupColor, selectedNodes, onCreateGroup])

    // Separate tables into grouped and ungrouped
    const groupedNodeIds = useMemo(() => {
      const ids = new Set<string>()
      for (const g of graph.groups || []) {
        for (const nodeId of g.nodeIds) {
          ids.add(nodeId)
        }
      }
      return ids
    }, [graph.groups])

    const ungroupedNodes = useMemo(() => {
      return graph.nodes.filter((n) => !groupedNodeIds.has(n.id))
    }, [graph.nodes, groupedNodeIds])

    if (graph.nodes.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2">
            <svg
              className="w-5 h-5 text-slate-400 dark:text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
              />
            </svg>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">No tables yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Write DSL or import to add tables
          </p>
        </div>
      )
    }

    // Helper to render a single table row
    const renderTableRow = (node: TableNode, inGroup = false) => {
      const isExpanded = expandedTables.has(node.id)
      const isSelected = selectedNodes.has(node.id)

      return (
        <div key={node.id}>
          <button
            onClick={() => {
              toggleExpand(node.id)
              onSelectNode(node.id)
            }}
            className={`w-full px-3 py-1.5 flex items-center gap-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 ${
              inGroup ? 'pl-6' : ''
            } ${
              isSelected
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                : 'text-slate-700 dark:text-slate-300'
            }`}
            aria-expanded={isExpanded}
            aria-label={`Table ${node.name}, ${node.columns.length} columns`}
          >
            <svg
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <svg
              className="w-4 h-4 text-blue-500 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span className="truncate">{node.name}</span>
            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
              {node.columns.length}
            </span>
          </button>

          {isExpanded && (
            <div className={`py-1 ${inGroup ? 'pl-10' : 'pl-8'}`}>
              {node.columns.map((col) => (
                <div
                  key={col.id}
                  className="flex items-center gap-2 px-2 py-1 text-xs text-slate-600 dark:text-slate-400"
                >
                  {col.isPrimaryKey && (
                    <span className="text-yellow-500" aria-label="Primary key">
                      🔑
                    </span>
                  )}
                  {col.isForeignKey && !col.isPrimaryKey && (
                    <span className="text-purple-500" aria-label="Foreign key">
                      🔗
                    </span>
                  )}
                  {!col.isPrimaryKey && !col.isForeignKey && (
                    <span className="w-4" aria-hidden="true" />
                  )}
                  <span className="truncate">{col.name}</span>
                  <span className="ml-auto text-slate-400 dark:text-slate-500">{col.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    // Virtualized mode for large schemas
    const useVirtualization = graph.nodes.length >= VIRTUALIZATION_THRESHOLD

    if (useVirtualization) {
      const totalHeight = graph.nodes.length * ROW_HEIGHT
      const visibleCount = 60
      const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 10)
      const endIndex = Math.min(graph.nodes.length, startIndex + visibleCount)
      const offsetY = startIndex * ROW_HEIGHT

      return (
        <div
          className="flex-1 overflow-y-auto py-2"
          onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
        >
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: offsetY,
                left: 0,
                right: 0,
              }}
            >
              {graph.nodes.slice(startIndex, endIndex).map((node) => {
                const isSelected = selectedNodes.has(node.id)
                return (
                  <button
                    key={node.id}
                    onClick={() => onSelectNode(node.id)}
                    className={`w-full px-3 py-1.5 flex items-center gap-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                    aria-label={`Table ${node.name}, ${node.columns.length} columns`}
                  >
                    <svg
                      className="w-4 h-4 text-blue-500 dark:text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="truncate">{node.name}</span>
                    <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                      {node.columns.length}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="px-3 pt-1 text-[11px] text-slate-400 dark:text-slate-500">
            Virtualized list enabled ({graph.nodes.length} tables)
          </div>
        </div>
      )
    }

    // Regular mode with groups support
    return (
      <div className="flex-1 overflow-y-auto">
        {/* Create Group Button */}
        {selectedNodes.size > 0 && onCreateGroup && (
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
            {showCreateGroupDialog ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Group name..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateGroup()
                    if (e.key === 'Escape') setShowCreateGroupDialog(false)
                  }}
                />
                <div className="flex gap-1">
                  {GROUP_COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setNewGroupColor(c.value)}
                      className={`w-5 h-5 rounded border-2 ${
                        newGroupColor === c.value
                          ? 'border-slate-800 dark:border-white'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim()}
                    className="flex-1 px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateGroupDialog(false)}
                    className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCreateGroupDialog(true)}
                className="w-full px-2 py-1.5 text-xs rounded border border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Group {selectedNodes.size} selected table{selectedNodes.size > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

        {/* Groups Section */}
        {(graph.groups || []).length > 0 && (
          <div className="py-2">
            <div className="px-3 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Groups ({graph.groups.length})
            </div>
            {(graph.groups || []).map((group) => {
              const isGroupExpanded = expandedGroups.has(group.id)
              const isGroupSelected = selectedGroups.has(group.id)
              const groupNodes = graph.nodes.filter((n) => group.nodeIds.includes(n.id))
              const groupColor = group.color || '#64748b'

              return (
                <div key={group.id}>
                  <div
                    className={`w-full px-3 py-1.5 flex items-center gap-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer ${
                      isGroupSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                    onClick={() => {
                      toggleGroupExpand(group.id)
                      onSelectGroup?.(group.id)
                    }}
                  >
                    {/* Expand/Collapse icon */}
                    <svg
                      className={`w-3 h-3 transition-transform ${isGroupExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>

                    {/* Group color indicator */}
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: groupColor }} />

                    {/* Group name */}
                    <span className="truncate flex-1 font-medium">{group.name}</span>

                    {/* Table count */}
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {groupNodes.length}
                    </span>

                    {/* Collapse toggle on canvas */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleGroupCollapse?.(group.id)
                      }}
                      className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
                      title={group.collapsed ? 'Expand on canvas' : 'Collapse on canvas'}
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        {group.collapsed ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                          />
                        ) : (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"
                          />
                        )}
                      </svg>
                    </button>

                    {/* Delete group */}
                    {onDeleteGroup && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteGroup(group.id)
                        }}
                        className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500"
                        title="Delete group"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Nested tables in group */}
                  {isGroupExpanded && (
                    <div className="border-l-2 ml-4" style={{ borderColor: groupColor }}>
                      {groupNodes.map((node) => renderTableRow(node, true))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Ungrouped Tables */}
        {ungroupedNodes.length > 0 && (
          <div className="py-2 border-t border-slate-200 dark:border-slate-700">
            <div className="px-3 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Tables ({ungroupedNodes.length})
            </div>
            {ungroupedNodes.map((node) => renderTableRow(node, false))}
          </div>
        )}
      </div>
    )
  }
)

SchemaTree.displayName = 'SchemaTree'

// ─────────────────────────────────────────────────────────────
// Settings Panel
// ─────────────────────────────────────────────────────────────

interface SettingsPanelProps {
  showGrid: boolean
  onShowGridChange: (show: boolean) => void
  snapToGrid: boolean
  onSnapToGridChange: (snap: boolean) => void
  gridSize: number
  onGridSizeChange: (size: number) => void
  theme: 'light' | 'dark'
  onThemeChange: (theme: 'light' | 'dark') => void
  language: 'en' | 'vi'
  onLanguageChange: (language: 'en' | 'vi') => void
  autoSaveIntervalMs: number
  onAutoSaveIntervalChange: (ms: number) => void
  zoomSpeed: 'slow' | 'normal' | 'fast'
  onZoomSpeedChange: (speed: 'slow' | 'normal' | 'fast') => void
  defaultSQLDialect: 'postgresql' | 'mysql' | 'sqlite'
  onDefaultSQLDialectChange: (dialect: 'postgresql' | 'mysql' | 'sqlite') => void
  imageScale: number
  onImageScaleChange: (scale: number) => void
  settingsJSON: string
  onSettingsImportFromJSON: (json: string) => void
  showPerformanceOverlay: boolean
  onShowPerformanceOverlayChange: (show: boolean) => void
  curvature: number
  onCurvatureChange: (value: number) => void
}

const SettingsPanel: React.FC<SettingsPanelProps> = memo(
  ({
    showGrid,
    onShowGridChange,
    snapToGrid,
    onSnapToGridChange,
    gridSize,
    onGridSizeChange,
    theme,
    onThemeChange,
    language,
    onLanguageChange,
    autoSaveIntervalMs,
    onAutoSaveIntervalChange,
    zoomSpeed,
    onZoomSpeedChange,
    defaultSQLDialect,
    onDefaultSQLDialectChange,
    imageScale,
    onImageScaleChange,
    settingsJSON,
    onSettingsImportFromJSON,
    showPerformanceOverlay,
    onShowPerformanceOverlayChange,
    curvature,
    onCurvatureChange,
  }) => {
    const handleCopyJSON = () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(settingsJSON).catch(() => {
          // ignore copy failures
        })
      }
    }

    const handleImportJSON = () => {
      // Simple prompt-based import to avoid complex UI
      // eslint-disable-next-line no-alert
      const input = window.prompt('Paste settings JSON:')
      if (!input) return
      onSettingsImportFromJSON(input)
    }

    return (
      <div className="flex-1 flex flex-col p-3 gap-4 overflow-y-auto">
        <div>
          <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-2">
            General
          </h3>
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
              <span>Theme</span>
              <select
                value={theme}
                onChange={(e) => onThemeChange(e.target.value as 'light' | 'dark')}
                className="px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                aria-label="Select theme"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
              <span>Language</span>
              <select
                value={language}
                onChange={(e) => onLanguageChange(e.target.value as 'en' | 'vi')}
                className="px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                aria-label="Select language"
              >
                <option value="en">English</option>
                <option value="vi">Tiếng Việt</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
              <span>Auto-save</span>
              <select
                value={autoSaveIntervalMs}
                onChange={(e) => onAutoSaveIntervalChange(Number(e.target.value))}
                className="px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                aria-label="Select auto-save interval"
              >
                <option value={0}>Disabled</option>
                <option value={1000}>Every 1s</option>
                <option value={3000}>Every 3s</option>
                <option value={10000}>Every 10s</option>
              </select>
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-2">
            Canvas
          </h3>
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
              <span>Show Grid</span>
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => onShowGridChange(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-500"
                aria-label="Toggle grid visibility"
              />
            </label>
            <label className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
              <span>Snap to Grid</span>
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => onSnapToGridChange(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-500"
                aria-label="Toggle snap to grid"
              />
            </label>
            <label className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
              <span>Grid Size</span>
              <select
                value={gridSize}
                onChange={(e) => onGridSizeChange(Number(e.target.value))}
                className="px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                aria-label="Select grid size"
              >
                <option value={10}>10px</option>
                <option value={20}>20px</option>
                <option value={40}>40px</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
              <span>Zoom Speed</span>
              <select
                value={zoomSpeed}
                onChange={(e) => onZoomSpeedChange(e.target.value as 'slow' | 'normal' | 'fast')}
                className="px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                aria-label="Select zoom speed"
              >
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
              <span>Performance Overlay</span>
              <input
                type="checkbox"
                checked={showPerformanceOverlay}
                onChange={(e) => onShowPerformanceOverlayChange(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-500"
                aria-label="Toggle performance overlay"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Edge Curvature</span>
                <span className="text-xs text-slate-400">{curvature.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={curvature}
                onChange={(e) => onCurvatureChange(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                aria-label="Edge curvature"
              />
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-2">
            Export
          </h3>
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
              <span>Default SQL Dialect</span>
              <select
                value={defaultSQLDialect}
                onChange={(e) =>
                  onDefaultSQLDialectChange(e.target.value as 'postgresql' | 'mysql' | 'sqlite')
                }
                className="px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                aria-label="Select default SQL dialect"
              >
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="sqlite">SQLite</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
              <span>PNG Scale</span>
              <select
                value={imageScale}
                onChange={(e) => onImageScaleChange(Number(e.target.value))}
                className="px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                aria-label="Select PNG export scale"
              >
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={3}>3x</option>
              </select>
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-2">
            Settings JSON
          </h3>
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyJSON}
                className="flex-1 px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Copy JSON
              </button>
              <button
                type="button"
                onClick={handleImportJSON}
                className="flex-1 px-2 py-1 text-xs rounded border border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
              >
                Import JSON
              </button>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Export/import all preferences as JSON. Import will overwrite current settings.
            </p>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
            ERD Designer v1.0.0
          </p>
        </div>
      </div>
    )
  }
)

SettingsPanel.displayName = 'SettingsPanel'

// ─────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────

type SidebarTab = 'schema' | 'editor' | 'history' | 'import' | 'settings' | 'debug'

export interface SidebarProps {
  graph: Graph
  selectedNodes: Set<string>
  selectedGroups?: Set<string>
  onSelectGroup?: (groupId: string) => void
  onCreateGroup?: (name: string, nodeIds: string[], color?: string) => void
  onDeleteGroup?: (groupId: string) => void
  onAddToGroup?: (groupId: string, nodeIds: string[]) => void
  onRemoveFromGroup?: (groupId: string, nodeIds: string[]) => void
  onToggleGroupCollapse?: (groupId: string) => void
  onSelectNode: (nodeId: string) => void
  onImportDSL: (content: string) => void
  onImportTypeScript: (content: string) => void
  onImportSchema: (schema: DatabaseSchema) => void
  showGrid: boolean
  onShowGridChange: (show: boolean) => void
  snapToGrid: boolean
  onSnapToGridChange: (snap: boolean) => void
  gridSize: number
  onGridSizeChange: (size: number) => void
  theme: 'light' | 'dark'
  onThemeChange: (theme: 'light' | 'dark') => void
  language: 'en' | 'vi'
  onLanguageChange: (language: 'en' | 'vi') => void
  autoSaveIntervalMs: number
  onAutoSaveIntervalChange: (ms: number) => void
  zoomSpeed: 'slow' | 'normal' | 'fast'
  onZoomSpeedChange: (speed: 'slow' | 'normal' | 'fast') => void
  defaultSQLDialect: 'postgresql' | 'mysql' | 'sqlite'
  onDefaultSQLDialectChange: (dialect: 'postgresql' | 'mysql' | 'sqlite') => void
  imageScale: number
  onImageScaleChange: (scale: number) => void
  settingsJSON: string
  onSettingsImportFromJSON: (json: string) => void
  dsl: string
  onDslChange: (value: string) => void
  error: { message: string; line: number; column: number; value?: string } | null
  schema: DatabaseSchema | null
  onGenerateLargeSchema: () => void
  showPerformanceOverlay: boolean
  onShowPerformanceOverlayChange: (show: boolean) => void
  curvature: number
  onCurvatureChange: (value: number) => void
  versionHistory: VersionHistory
  onRestoreSnapshot: (snapshot: Snapshot) => void
  onDeleteSnapshot: (id: string) => void
  onSaveSnapshot: (name: string, summary: string) => void
}

export const Sidebar: React.FC<SidebarProps> = memo(
  ({
    graph,
    selectedNodes,
    selectedGroups,
    onSelectNode,
    onSelectGroup,
    onCreateGroup,
    onDeleteGroup,
    onAddToGroup,
    onRemoveFromGroup,
    onToggleGroupCollapse,
    onImportDSL,
    onImportTypeScript,
    onImportSchema,
    showGrid,
    onShowGridChange,
    snapToGrid,
    onSnapToGridChange,
    gridSize,
    onGridSizeChange,
    theme,
    onThemeChange,
    language,
    onLanguageChange,
    autoSaveIntervalMs,
    onAutoSaveIntervalChange,
    zoomSpeed,
    onZoomSpeedChange,
    defaultSQLDialect,
    onDefaultSQLDialectChange,
    imageScale,
    onImageScaleChange,
    settingsJSON,
    onSettingsImportFromJSON,
    dsl,
    onDslChange,
    error,
    schema,
    onGenerateLargeSchema,
    showPerformanceOverlay,
    onShowPerformanceOverlayChange,
    curvature,
    onCurvatureChange,
    versionHistory,
    onRestoreSnapshot,
    onDeleteSnapshot,
    onSaveSnapshot,
  }) => {
    const [activeTab, setActiveTab] = useState<SidebarTab>('schema')

    // Custom highlighting style for DSL
    const highlightExtension = useMemo(() => {
      const isDark = theme === 'dark'
      const style = HighlightStyle.define([
        { tag: t.keyword, color: isDark ? '#c678dd' : '#a71d5d', fontWeight: 'bold' },
        { tag: t.className, color: isDark ? '#d19a66' : '#6f42c1' }, // Table names: Yellow/Gold
        { tag: t.variableName, color: isDark ? '#ef596f' : '#005cc5' }, // Field names: Pink/Red
        { tag: t.typeName, color: isDark ? '#4fc3f7' : '#6f42c1' }, // Data types: Bright Cyan
        { tag: t.labelName, color: isDark ? '#98c379' : '#22863a' }, // Constraints (pk, etc): Green
        { tag: t.comment, color: isDark ? '#7f848e' : '#969896', fontStyle: 'italic' },
        { tag: t.string, color: isDark ? '#98c379' : '#183691' },
        { tag: t.number, color: isDark ? '#d19a66' : '#0086b3' },
        { tag: t.punctuation, color: isDark ? '#abb2bf' : '#333' },
        { tag: t.operator, color: isDark ? '#56b6c2' : '#005cc5' },
      ])

      const extensions = [dslLanguage, syntaxHighlighting(style)]

      // Error highlighting decoration
      if (error && error.line > 0) {
        extensions.push(
          EditorView.decorations.of((view) => {
            try {
              if (error.line <= 0 || error.line > view.state.doc.lines) return Decoration.none
              const line = view.state.doc.line(error.line)
              const decorations = [Decoration.line({ class: 'cm-error-line' }).range(line.from)]

              // Add squiggly underline (mark) at the specific column
              // column is 1-indexed from lexer
              const start = line.from + Math.max(0, error.column - 1)
              const end = error.value ? start + error.value.length : start + 1
              // Ensure we don't go past the line end
              const safeEnd = Math.min(end, line.to)
              const safeStart = Math.min(start, safeEnd)

              if (safeStart < safeEnd) {
                decorations.push(
                  Decoration.mark({ class: 'cm-error-mark' }).range(safeStart, safeEnd)
                )
              } else if (safeStart === line.from && line.from === line.to) {
                // Empty line error
              } else {
                // Fallback mark if range is zero
                decorations.push(
                  Decoration.mark({ class: 'cm-error-mark' }).range(
                    line.from,
                    Math.min(line.from + 1, line.to)
                  )
                )
              }

              return Decoration.set(decorations.sort((a, b) => a.from - b.from))
            } catch (e) {
              return Decoration.none
            }
          })
        )

        // Add gutter marker
        extensions.push(
          gutter({
            lineMarker(view, line) {
              const errorLine = view.state.doc.lineAt(line.from).number
              if (errorLine === error.line) {
                return new (class extends GutterMarker {
                  toDOM() {
                    const span = document.createElement('span')
                    span.className = 'cm-error-gutter-marker'
                    span.textContent = '❌'
                    span.title = error.message
                    return span
                  }
                })()
              }
              return null
            },
            initialSpacer: () =>
              new (class extends GutterMarker {
                toDOM() {
                  const span = document.createElement('span')
                  span.textContent = '❌'
                  span.style.visibility = 'hidden'
                  return span
                }
              })(),
          })
        )
      }

      return extensions
    }, [theme, error])

    // Handler để chuyển đổi schema khi import
    const handleImport = useCallback(
      (schema: DatabaseSchema) => {
        // Forward parsed schema to app-level handler for building graph
        onImportSchema(schema)
      },
      [onImportSchema]
    )

    return (
      <div className="w-full h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0">
        {/* Tabs */}
        <div
          className="flex border-b border-slate-200 dark:border-slate-700"
          role="tablist"
          aria-label="Sidebar tabs"
        >
          <TabButton
            active={activeTab === 'schema'}
            onClick={() => setActiveTab('schema')}
            icon={
              <svg
                className="w-4 h-4 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                />
              </svg>
            }
            label="Schema"
          />
          <TabButton
            active={activeTab === 'editor'}
            onClick={() => setActiveTab('editor')}
            icon={
              <svg
                className="w-4 h-4 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            }
            label="Editor"
          />
          <TabButton
            active={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            icon={
              <svg
                className="w-4 h-4 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            label="History"
          />
          <TabButton
            active={activeTab === 'import'}
            onClick={() => setActiveTab('import')}
            icon={
              <svg
                className="w-4 h-4 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
            }
            label="Import"
          />
          <TabButton
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            icon={
              <svg
                className="w-4 h-4 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
            label="Settings"
          />
          <TabButton
            active={activeTab === 'debug'}
            onClick={() => setActiveTab('debug')}
            icon={
              <svg
                className="w-4 h-4 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2z"
                />
              </svg>
            }
            label="Debug"
          />
        </div>

        {/* Content */}
        {activeTab === 'schema' && (
          <SchemaTree
            graph={graph}
            selectedNodes={selectedNodes}
            selectedGroups={selectedGroups}
            onSelectNode={onSelectNode}
            onSelectGroup={onSelectGroup}
            onCreateGroup={onCreateGroup}
            onDeleteGroup={onDeleteGroup}
            onAddToGroup={onAddToGroup}
            onRemoveFromGroup={onRemoveFromGroup}
            onToggleGroupCollapse={onToggleGroupCollapse}
          />
        )}
        {activeTab === 'editor' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-hidden relative">
              <CodeMirror
                value={dsl}
                height="100%"
                extensions={highlightExtension}
                onChange={onDslChange}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLine: true,
                }}
                theme={theme === 'dark' ? 'dark' : 'light'}
                className="h-full codemirror-wrapper absolute inset-0"
              />
            </div>
            {error && (
              <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border-t border-red-100 dark:border-red-800 shrink-0">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5">⚠</span>
                  <div>
                    <div className="font-semibold">
                      Syntax Error {error.line > 0 ? `at line ${error.line}` : ''}
                    </div>
                    <div className="text-xs opacity-90">{error.message}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'history' && (
          <HistoryPanel
            history={versionHistory}
            onRestore={onRestoreSnapshot}
            onDelete={onDeleteSnapshot}
            onSave={onSaveSnapshot}
          />
        )}
        {activeTab === 'import' && <ImportPanel onImport={handleImport} />}
        {activeTab === 'settings' && (
          <SettingsPanel
            showGrid={showGrid}
            onShowGridChange={onShowGridChange}
            snapToGrid={snapToGrid}
            onSnapToGridChange={onSnapToGridChange}
            gridSize={gridSize}
            onGridSizeChange={onGridSizeChange}
            theme={theme}
            onThemeChange={onThemeChange}
            language={language}
            onLanguageChange={onLanguageChange}
            autoSaveIntervalMs={autoSaveIntervalMs}
            onAutoSaveIntervalChange={onAutoSaveIntervalChange}
            zoomSpeed={zoomSpeed}
            onZoomSpeedChange={onZoomSpeedChange}
            defaultSQLDialect={defaultSQLDialect}
            onDefaultSQLDialectChange={onDefaultSQLDialectChange}
            imageScale={imageScale}
            onImageScaleChange={onImageScaleChange}
            settingsJSON={settingsJSON}
            onSettingsImportFromJSON={onSettingsImportFromJSON}
            showPerformanceOverlay={showPerformanceOverlay}
            onShowPerformanceOverlayChange={onShowPerformanceOverlayChange}
            curvature={curvature}
            onCurvatureChange={onCurvatureChange}
          />
        )}
        {activeTab === 'debug' && (
          <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto text-xs text-slate-700 dark:text-slate-200">
            <div>
              <h3 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Overview
              </h3>
              <p>Tables: {graph.nodes.length}</p>
              <p>Relations: {graph.edges.length}</p>
              <p>DSL length: {dsl.length} chars</p>
            </div>

            <div>
              <h3 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Schema (IR) Preview
              </h3>
              <pre className="max-h-32 overflow-auto bg-slate-950/60 text-[10px] rounded p-2 text-slate-100">
                {schema ? JSON.stringify(schema, null, 2).slice(0, 1200) : 'No schema parsed yet'}
              </pre>
            </div>

            <div>
              <h3 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Graph Preview
              </h3>
              <pre className="max-h-32 overflow-auto bg-slate-950/60 text-[10px] rounded p-2 text-slate-100">
                {JSON.stringify(
                  {
                    bounds: (graph as Graph & { bounds?: unknown }).bounds ?? null,
                    nodes: graph.nodes.map((n) => ({ id: n.id, name: n.name })),
                    edges: graph.edges.slice(0, 20).map((e) => ({
                      id: e.id,
                      from: e.from,
                      to: e.to,
                    })),
                  },
                  null,
                  2
                ).slice(0, 1200)}
              </pre>
            </div>

            <div>
              <h3 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Browser Memory
              </h3>
              <pre className="bg-slate-950/60 text-[10px] rounded p-2 text-slate-100">
                {(() => {
                  const perf = (
                    performance as Performance & {
                      memory?: { usedJSHeapSize: number; totalJSHeapSize: number }
                    }
                  ).memory
                  if (!perf) return 'performance.memory not available in this browser.'
                  const used = Math.round((perf.usedJSHeapSize / 1024 / 1024) * 10) / 10
                  const total = Math.round((perf.totalJSHeapSize / 1024 / 1024) * 10) / 10
                  return `usedJSHeapSize: ${used} MB\ntotalJSHeapSize: ${total} MB`
                })()}
              </pre>
            </div>

            <div className="mt-auto pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={onGenerateLargeSchema}
                className="w-full text-xs px-2 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium"
              >
                Generate Large Test Schema (500+ tables)
              </button>
              <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                Use this to stress test layout, rendering and viewport culling.
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }
)

Sidebar.displayName = 'Sidebar'

export default Sidebar
