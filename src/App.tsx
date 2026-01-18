import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Panel, Group as PanelGroup, type PanelImperativeHandle } from 'react-resizable-panels'
import { ResizeHandle } from './components/ui/ResizeHandle'

import { parseDSL, ParserError } from './core/parser'
import { importTypeScript } from './core/importers/typescript'
import { buildGraph, layoutGraph, computeGraphBounds } from './core/graph'
import type {
  Graph,
  TableNode,
  Edge,
  Snapshot,
  VersionHistory,
  TableGroup,
} from './core/graph/types'
import type { DatabaseSchema, Table } from './core/ir/types'
import { ERDCanvas } from './components/renderer'
import {
  Toolbar,
  Sidebar,
  PropertyPanel,
  ZoomControls,
  MiniMap,
  CommandPalette,
  ShortcutsHelpModal,
  PerformanceOverlay,
  useToast,
  type CommandItem,
} from './components/ui'
import { useHistory, useHistoryKeyboard, useKeyboardShortcuts, useVersionHistory } from './hooks'
import { useTheme } from './contexts'
import { downloadSVG, downloadPNG, downloadSQL, type SQLDialect } from './utils/export'
import {
  downloadProject,
  importProjectFromFile,
  createNewProject,
  useAutoSave,
  loadSettings,
  saveSettings,
  loadFromLocalStorage,
  saveToLocalStorage,
  type AppSettings,
} from './utils/persistence'

type LayoutAlgorithm = 'dagre' | 'grid'

// ─────────────────────────────────────────────────────────────
// Sample DSL for demo
// ─────────────────────────────────────────────────────────────

const SAMPLE_DSL = `
Table users {
  id int [pk, increment]
  username varchar(50) [unique, not null]
  email varchar(100) [unique, not null]
  created_at timestamp
}

Table posts {
  id int [pk, increment]
  title varchar(200) [not null]
  body text
  author_id int [not null]
  created_at timestamp
}

Table comments {
  id int [pk, increment]
  post_id int [not null]
  user_id int [not null]
  content text [not null]
  created_at timestamp
}

Ref: posts.author_id > users.id
Ref: comments.post_id > posts.id
Ref: comments.user_id > users.id
`.trim()

// ─────────────────────────────────────────────────────────────
// App Component
// ─────────────────────────────────────────────────────────────

export default function App(): JSX.Element {
  const { addToast } = useToast()
  const svgRef = useRef<HTMLDivElement>(null)

  // Load persisted project (if present) so groups/graph are restored on reload
  const persistedProject = React.useMemo(() => loadFromLocalStorage(), [])

  const [dsl, setDsl] = useState<string>(() => persistedProject?.dsl ?? SAMPLE_DSL)
  const [schema, setSchema] = useState<DatabaseSchema | null>(
    () => persistedProject?.schema ?? null
  )
  const [error, setError] = useState<{
    message: string
    line: number
    column: number
    value?: string
  } | null>(null)
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [selectedEdges, setSelectedEdges] = useState<Set<string>>(new Set())
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())

  // Theme context
  const { theme, toggleTheme, setTheme } = useTheme()

  // App-wide settings & preferences
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())

  // Persist settings whenever they change
  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  // Layout & zoom state
  const [currentLayout, setCurrentLayout] = useState<LayoutAlgorithm>('dagre')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 })

  // Canvas settings
  const [showGrid, setShowGrid] = useState(settings.canvas.showGrid)
  const [snapToGrid, setSnapToGrid] = useState(settings.canvas.snapToGrid)
  const [gridSize, setGridSize] = useState(settings.canvas.gridSize)
  const [showPerformanceOverlay, setShowPerformanceOverlay] = useState(
    settings.canvas.showPerformanceOverlay
  )
  const [curvature, setCurvature] = useState(settings.canvas.curvature)

  // Zoom speed preference
  const zoomSpeed = settings.canvas.zoomSpeed
  const zoomFactor = zoomSpeed === 'slow' ? 1.1 : zoomSpeed === 'fast' ? 1.35 : 1.2

  // Panel refs and state
  const sidebarRef = useRef<PanelImperativeHandle>(null)
  const propertiesRef = useRef<PanelImperativeHandle>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isPropertiesCollapsed, setIsPropertiesCollapsed] = useState(false)

  // Command palette & shortcuts help
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false)

  // Parse and build graph
  const initialGraph = useMemo(() => {
    // If there's a persisted graph, use it directly (preserves groups)
    if (persistedProject?.graph) return persistedProject.graph as Graph

    try {
      const parsed = parseDSL(dsl)
      setSchema(parsed)
      setError(null)
      const graph = buildGraph(parsed)
      return layoutGraph(graph, currentLayout, { direction: 'LR' })
    } catch (e) {
      if (e instanceof ParserError) {
        setError({ message: e.message, line: e.line, column: e.column, value: e.value })
      } else {
        setError({ message: e instanceof Error ? e.message : 'Parse error', line: 0, column: 0 })
      }
      return { nodes: [], edges: [], groups: [], notes: [] }
    }
  }, [])

  // History for undo/redo
  const [graph, historyActions] = useHistory<Graph>(initialGraph)
  useHistoryKeyboard(historyActions)

  // Version History (Task 43)
  const {
    history: versionHistory,
    saveSnapshot,
    deleteSnapshot,
  } = useVersionHistory(dsl, graph, schema ?? undefined)

  const handleSaveSnapshot = useCallback(
    (name: string, summary: string) => {
      saveSnapshot(name, summary)
      addToast(`Snapshot "${name}" saved`, 'success')
    },
    [saveSnapshot, addToast]
  )

  const handleRestoreSnapshot = useCallback(
    (snapshot: Snapshot) => {
      setDsl(snapshot.dsl)
      setSchema(snapshot.schema ?? null)
      historyActions.set(snapshot.graph)
      addToast(`Restored to "${snapshot.name}"`, 'success')
    },
    [historyActions, addToast]
  )

  // Sync canvas-related settings back into settings state
  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      canvas: {
        ...prev.canvas,
        showGrid,
        snapToGrid,
        gridSize,
        showPerformanceOverlay,
        curvature,
      },
    }))
  }, [showGrid, snapToGrid, gridSize, showPerformanceOverlay, curvature])

  // Sync theme from context into settings
  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      general: {
        ...prev.general,
        theme,
      },
    }))
  }, [theme])

  // Auto-save project to localStorage based on settings
  useAutoSave(dsl, graph, schema ?? undefined, settings.general.autoSaveIntervalMs)

  // Keep a ref to the current graph so auto-update can merge groups without adding `graph` as dependency
  const currentGraphRef = React.useRef(graph)
  React.useEffect(() => {
    currentGraphRef.current = graph
  }, [graph])

  // Merge groups from current graph into a newly layouted graph (preserve UI-created groups)
  const mergeGroupsIntoLayout = useCallback(
    (layouted: Graph) => {
      const prevGroups = currentGraphRef.current?.groups || []
      const nextGroups = layouted.groups || []

      const mergedGroupsMap = new Map<string, TableGroup>()
      for (const g of nextGroups) mergedGroupsMap.set(g.id, { ...g })

      for (const pg of prevGroups) {
        const existing = mergedGroupsMap.get(pg.id)
        if (existing) {
          mergedGroupsMap.set(pg.id, {
            ...existing,
            color: pg.color ?? existing.color,
            collapsed: pg.collapsed ?? existing.collapsed,
            selected: pg.selected ?? existing.selected,
            nodeIds: Array.from(new Set([...(existing.nodeIds || []), ...(pg.nodeIds || [])])),
          })
        } else {
          mergedGroupsMap.set(pg.id, { ...pg })
        }
      }

      const mergedGroups = Array.from(mergedGroupsMap.values())
      const merged = { ...layouted, groups: mergedGroups }
      return computeGraphBounds(merged)
    },
    [computeGraphBounds]
  )

  // When auto-save is enabled, also update the diagram (parse + rebuild + layout)
  // after the configured debounce interval so the canvas reflects DSL edits.
  React.useEffect(() => {
    const ms = settings.general.autoSaveIntervalMs ?? 0
    if (!ms || ms <= 0) return

    const timer = setTimeout(() => {
      try {
        const parsed = parseDSL(dsl)
        setSchema(parsed)
        setError(null)
        const newGraph = buildGraph(parsed)
        let layouted = layoutGraph(newGraph, currentLayout, { direction: 'LR' })

        // Merge groups from current graph (preserve UI-created groups and user settings)
        const prevGroups = currentGraphRef.current?.groups || []
        const nextGroups = layouted.groups || []

        const mergedGroupsMap = new Map<string, TableGroup>()
        // start with groups from layouted (from DSL)
        for (const g of nextGroups) mergedGroupsMap.set(g.id, { ...g })

        // merge properties from prevGroups (preserve color/collapsed/selected/nodeIds if needed)
        for (const pg of prevGroups) {
          const existing = mergedGroupsMap.get(pg.id)
          if (existing) {
            mergedGroupsMap.set(pg.id, {
              ...existing,
              color: pg.color ?? existing.color,
              collapsed: pg.collapsed ?? existing.collapsed,
              selected: pg.selected ?? existing.selected,
              nodeIds: Array.from(new Set([...(existing.nodeIds || []), ...(pg.nodeIds || [])])),
            })
          } else {
            // group created by UI (not present in DSL) -> preserve it
            mergedGroupsMap.set(pg.id, { ...pg })
          }
        }

        const mergedGroups = Array.from(mergedGroupsMap.values())
        layouted = { ...layouted, groups: mergedGroups }

        // Recompute bounds to include merged groups
        const withBounds = computeGraphBounds(layouted)
        historyActions.set(withBounds)
      } catch (e) {
        if (e instanceof ParserError) {
          setError({ message: e.message, line: e.line, column: e.column, value: e.value })
        } else {
          setError({ message: e instanceof Error ? e.message : 'Parse error', line: 0, column: 0 })
        }
      }
    }, ms)

    return () => clearTimeout(timer)
  }, [dsl, settings.general.autoSaveIntervalMs, currentLayout, historyActions])

  // Real-time DSL validation for syntax highlighting in editor
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        parseDSL(dsl)
        setError(null)
      } catch (e) {
        if (e instanceof ParserError) {
          setError({ message: e.message, line: e.line, column: e.column, value: e.value })
        } else {
          setError({
            message: e instanceof Error ? e.message : 'Parse error',
            line: 0,
            column: 0,
          })
        }
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [dsl])

  // Update graph when DSL changes
  const handleParse = useCallback(() => {
    try {
      const parsed = parseDSL(dsl)
      setSchema(parsed)
      setError(null)
      const newGraph = buildGraph(parsed)
      const layouted = layoutGraph(newGraph, currentLayout, { direction: 'LR' })

      // Merge groups from current graph to avoid losing UI-only groups
      const merged = mergeGroupsIntoLayout(layouted)
      historyActions.set(merged)
      // Persist immediately when user triggers parse
      try {
        saveToLocalStorage(dsl, merged, parsed)
      } catch {
        // ignore persistence errors
      }
    } catch (e) {
      if (e instanceof ParserError) {
        setError({ message: e.message, line: e.line, column: e.column, value: e.value })
      } else {
        setError({
          message: e instanceof Error ? e.message : 'Parse error',
          line: 0,
          column: 0,
        })
      }
    }
  }, [dsl, currentLayout, historyActions])

  // Layout change handler
  const handleLayoutChange = useCallback(
    (layout: LayoutAlgorithm) => {
      setCurrentLayout(layout)
      if (graph.nodes.length > 0) {
        const relayouted = layoutGraph(graph, layout, { direction: 'LR' })
        historyActions.set(relayouted)
      }
    },
    [graph, historyActions]
  )

  // Graph change handler (for drag etc.)
  const handleGraphChange = useCallback(
    (newGraph: Graph) => {
      historyActions.set(newGraph)
    },
    [historyActions]
  )

  // Selection handler
  const handleSelectionChange = useCallback(
    (nodes: Set<string>, edges: Set<string>, groups: Set<string>) => {
      setSelectedNodes(nodes)
      setSelectedEdges(edges)
      setSelectedGroups(groups)
    },
    []
  )

  // Get selected table for property panel
  const selectedTable = useMemo((): TableNode | null => {
    if (selectedNodes.size !== 1) return null
    const nodeId = Array.from(selectedNodes)[0]
    return graph.nodes.find((n) => n.id === nodeId) || null
  }, [selectedNodes, graph.nodes])

  const selectedEdge = useMemo((): Edge | null => {
    if (selectedEdges.size !== 1) return null
    const edgeId = Array.from(selectedEdges)[0]
    return graph.edges.find((e) => e.id === edgeId) || null
  }, [selectedEdges, graph.edges])

  const selectedGroup = useMemo((): TableGroup | null => {
    if (selectedGroups.size !== 1) return null
    const groupId = Array.from(selectedGroups)[0]
    return graph.groups.find((g) => g.id === groupId) || null
  }, [selectedGroups, graph.groups])

  // Table update handler
  const handleTableUpdate = useCallback(
    (tableId: string, updates: Partial<TableNode>) => {
      const newGraph = {
        ...graph,
        nodes: graph.nodes.map((n) => (n.id === tableId ? { ...n, ...updates } : n)),
      }
      historyActions.set(newGraph)
    },
    [graph, historyActions]
  )

  // Column update handler
  const handleColumnUpdate = useCallback(
    (tableId: string, columnId: string, updates: Record<string, unknown>) => {
      const newGraph = {
        ...graph,
        nodes: graph.nodes.map((n) => {
          if (n.id !== tableId) return n
          return {
            ...n,
            columns: n.columns.map((c) => (c.id === columnId ? { ...c, ...updates } : c)),
          }
        }),
      }
      historyActions.set(newGraph)
    },
    [graph, historyActions]
  )

  // Edge update handler
  const handleEdgeUpdate = useCallback(
    (edgeId: string, updates: Partial<Edge>) => {
      const newGraph = {
        ...graph,
        edges: graph.edges.map((e) => (e.id === edgeId ? { ...e, ...updates } : e)),
      }
      historyActions.set(newGraph)
    },
    [graph, historyActions]
  )

  // Group update handler (Task 44)
  const handleGroupUpdate = useCallback(
    (groupId: string, updates: Partial<TableGroup>) => {
      const newGraph = {
        ...graph,
        groups: graph.groups.map((g) => (g.id === groupId ? { ...g, ...updates } : g)),
      }
      const withBounds = computeGraphBounds(newGraph)
      historyActions.set(withBounds)
    },
    [graph, historyActions]
  )

  // Create a new group from selected nodes
  const handleCreateGroup = useCallback(
    (name: string, nodeIds: string[], color?: string) => {
      const id = name // use name as id for now
      const existing = graph.groups.find((g) => g.id === id)
      const newGroup = {
        id,
        name,
        color,
        nodeIds: Array.from(new Set(nodeIds)),
        collapsed: false,
        selected: false,
      }

      const updatedNodes = graph.nodes.map((n) =>
        newGroup.nodeIds.includes(n.id) ? { ...n, group: newGroup.id } : n
      )

      const g = { ...graph, nodes: updatedNodes, groups: [...graph.groups, newGroup] }
      historyActions.set(computeGraphBounds(g))
    },
    [graph, historyActions]
  )

  const handleDeleteGroup = useCallback(
    (groupId: string) => {
      const updatedGroups = graph.groups.filter((g) => g.id !== groupId)
      const updatedNodes = graph.nodes.map((n) =>
        n.group === groupId ? { ...n, group: undefined } : n
      )
      historyActions.set(
        computeGraphBounds({ ...graph, groups: updatedGroups, nodes: updatedNodes })
      )
    },
    [graph, historyActions]
  )

  const handleAddToGroup = useCallback(
    (groupId: string, nodeIds: string[]) => {
      const updatedGroups = graph.groups.map((g) =>
        g.id === groupId ? { ...g, nodeIds: Array.from(new Set([...g.nodeIds, ...nodeIds])) } : g
      )
      const updatedNodes = graph.nodes.map((n) =>
        nodeIds.includes(n.id) ? { ...n, group: groupId } : n
      )
      historyActions.set(
        computeGraphBounds({ ...graph, groups: updatedGroups, nodes: updatedNodes })
      )
    },
    [graph, historyActions]
  )

  const handleRemoveFromGroup = useCallback(
    (groupId: string, nodeIds: string[]) => {
      const updatedGroups = graph.groups.map((g) =>
        g.id === groupId ? { ...g, nodeIds: g.nodeIds.filter((id) => !nodeIds.includes(id)) } : g
      )
      const updatedNodes = graph.nodes.map((n) =>
        nodeIds.includes(n.id) ? { ...n, group: undefined } : n
      )
      historyActions.set(
        computeGraphBounds({ ...graph, groups: updatedGroups, nodes: updatedNodes })
      )
    },
    [graph, historyActions]
  )

  const handleToggleGroupCollapse = useCallback(
    (groupId: string) => {
      const updatedGroups = graph.groups.map((g) =>
        g.id === groupId ? { ...g, collapsed: !g.collapsed } : g
      )
      historyActions.set(computeGraphBounds({ ...graph, groups: updatedGroups }))
    },
    [graph, historyActions]
  )

  // Assign a single table to a group (or remove from groups when groupId undefined)
  const handleAssignTableToGroup = useCallback(
    (tableId: string, groupId?: string) => {
      const updatedGroups = graph.groups.map((g) => {
        // remove from any group it currently belongs to
        if (g.nodeIds.includes(tableId) && g.id !== groupId) {
          return { ...g, nodeIds: g.nodeIds.filter((id) => id !== tableId) }
        }
        // add to target group
        if (g.id === groupId && !g.nodeIds.includes(tableId)) {
          return { ...g, nodeIds: [...g.nodeIds, tableId] }
        }
        return g
      })

      const updatedNodes = graph.nodes.map((n) => (n.id === tableId ? { ...n, group: groupId } : n))
      historyActions.set(
        computeGraphBounds({ ...graph, groups: updatedGroups, nodes: updatedNodes })
      )
    },
    [graph, historyActions]
  )

  // Export handlers
  const handleExportSVG = useCallback(() => {
    const svg = svgRef.current?.querySelector('svg')
    if (svg) downloadSVG(svg as SVGSVGElement, 'erd-diagram.svg')
  }, [])

  const handleExportPNG = useCallback(async () => {
    const svg = svgRef.current?.querySelector('svg')
    if (!svg) return
    try {
      await downloadPNG(svg as SVGSVGElement, 'erd-diagram.png', settings.export.imageScale)
      addToast('PNG exported successfully', 'success')
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to export PNG', e)
      addToast('Failed to export PNG', 'error')
    }
  }, [settings.export.imageScale, addToast])

  const handleExportSQL = useCallback(
    (dialect: SQLDialect) => {
      if (!schema) return
      try {
        downloadSQL(schema, `schema-${dialect}.sql`, dialect)
        addToast(`SQL (${dialect}) exported successfully`, 'success')
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to export SQL', e)
        addToast('Failed to export SQL', 'error')
      }
      // Remember last used dialect as default preference
      setSettings((prev) => ({
        ...prev,
        export: {
          ...prev.export,
          defaultSQLDialect: dialect,
        },
      }))
    },
    [schema, addToast]
  )

  // Save/Load handlers
  const handleSaveProject = useCallback(() => {
    const project = createNewProject('ERD Project', dsl)
    project.graph = graph
    project.schema = schema ?? undefined
    try {
      downloadProject(project, 'erd-project.json')
      addToast('Project saved', 'success')
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to save project', e)
      addToast('Failed to save project', 'error')
    }
  }, [dsl, graph, schema, addToast])

  const handleOpenProject = useCallback(async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.erd.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const project = await importProjectFromFile(file)
        if (project.dsl) setDsl(project.dsl)
        if (project.graph) historyActions.set(project.graph)
        // Persist loaded project into localStorage so reload preserves it
        try {
          saveToLocalStorage(project.dsl, project.graph, project.schema)
        } catch {
          // ignore
        }
        addToast('Project loaded', 'success')
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to open project:', err)
        addToast('Failed to open project', 'error')
      }
    }
    input.click()
  }, [historyActions, addToast])

  // Import handlers
  const handleImportDSL = useCallback(
    (content: string) => {
      setDsl(content)
      try {
        const parsed = parseDSL(content)
        setSchema(parsed)
        setError(null)
        const newGraph = buildGraph(parsed)
        const layouted = layoutGraph(newGraph, currentLayout, { direction: 'LR' })
        const merged = mergeGroupsIntoLayout(layouted)
        historyActions.set(merged)
        // Persist imported DSL immediately
        try {
          saveToLocalStorage(content, merged, parsed)
        } catch {
          // ignore
        }
      } catch (e) {
        setError({
          message: e instanceof Error ? e.message : 'Parse error',
          line: 0,
          column: 0,
        })
      }
    },
    [currentLayout, historyActions]
  )

  const handleGenerateLargeSchema = useCallback(() => {
    const tables = Array.from({ length: 500 }).map(
      (_, i): Table => ({
        name: `table_${i}`,
        columns: [
          {
            name: 'id',
            type: 'int',
            rawType: 'int',
            settings: { primaryKey: true, autoIncrement: true },
          },
          { name: 'value', type: 'varchar', rawType: 'varchar(255)', settings: {} },
        ],
        indexes: [],
      })
    )

    const largeSchema: DatabaseSchema = {
      tables,
      relations: [],
      enums: [],
      tableGroups: [],
    }

    setSchema(largeSchema)
    setError(null)
    try {
      const newGraph = buildGraph(largeSchema)
      const layouted = layoutGraph(newGraph, currentLayout, { direction: 'LR' })
      historyActions.set(layouted)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to generate large schema graph', e)
      setError({
        message: e instanceof Error ? e.message : 'Error generating large schema',
        line: 0,
        column: 0,
      })
    }
  }, [currentLayout, historyActions])

  const handleImportTypeScript = useCallback(
    (content: string) => {
      try {
        const parsed = importTypeScript(content)
        setSchema(parsed)
        setError(null)
        const newGraph = buildGraph(parsed)
        const layouted = layoutGraph(newGraph, currentLayout, { direction: 'LR' })
        const merged = mergeGroupsIntoLayout(layouted)
        historyActions.set(merged)
        // Persist imported schema/graph
        try {
          saveToLocalStorage(dsl, merged, parsed)
        } catch {
          // ignore
        }
      } catch (e) {
        setError({
          message: e instanceof Error ? e.message : 'Import error',
          line: 0,
          column: 0,
        })
      }
    },
    [currentLayout, historyActions]
  )

  // Zoom handlers
  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z * zoomFactor, 4)), [zoomFactor])
  const handleZoomOut = useCallback(
    () => setZoom((z) => Math.max(z / zoomFactor, 0.25)),
    [zoomFactor]
  )
  const handleZoomReset = useCallback(() => setZoom(1), [])
  const handleFitView = useCallback(() => setZoom(1), []) // Placeholder - can be enhanced

  // Panel toggle handlers for keyboard shortcuts
  const handleToggleSidebar = useCallback(() => {
    if (!sidebarRef.current) return
    if (isSidebarCollapsed || sidebarRef.current.isCollapsed()) {
      sidebarRef.current.expand()
      setIsSidebarCollapsed(false)
    } else {
      sidebarRef.current.collapse()
      setIsSidebarCollapsed(true)
    }
  }, [isSidebarCollapsed])

  const handleToggleProperties = useCallback(() => {
    if (!propertiesRef.current) return
    if (isPropertiesCollapsed || propertiesRef.current.isCollapsed()) {
      propertiesRef.current.expand()
      setIsPropertiesCollapsed(false)
    } else {
      propertiesRef.current.collapse()
      setIsPropertiesCollapsed(true)
    }
  }, [isPropertiesCollapsed])

  // Keyboard shortcuts (Task 38)
  useKeyboardShortcuts(
    {
      onZoomIn: handleZoomIn,
      onZoomOut: handleZoomOut,
      onFitView: handleFitView,
      onResetZoom: handleZoomReset,
      onToggleSidebar: handleToggleSidebar,
      onToggleProperties: handleToggleProperties,
      onSetThemeLight: () => setTheme('light'),
      onSetThemeDark: () => setTheme('dark'),
      onOpenCommandPalette: () => setIsCommandPaletteOpen(true),
      onOpenShortcutsHelp: () => setIsShortcutsHelpOpen((prev) => !prev),
    },
    true
  )

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: 'parse',
        label: 'Parse DSL',
        shortcut: 'Parse button',
        action: handleParse,
      },
      {
        id: 'undo',
        label: 'Undo',
        shortcut: 'Cmd/Ctrl+Z',
        action: historyActions.undo,
      },
      {
        id: 'redo',
        label: 'Redo',
        shortcut: 'Shift+Cmd/Ctrl+Z',
        action: historyActions.redo,
      },
      {
        id: 'zoom-in',
        label: 'Zoom In',
        shortcut: 'Ctrl/Cmd + +',
        action: handleZoomIn,
      },
      {
        id: 'zoom-out',
        label: 'Zoom Out',
        shortcut: 'Ctrl/Cmd + -',
        action: handleZoomOut,
      },
      {
        id: 'fit-view',
        label: 'Fit View',
        shortcut: 'F',
        action: handleFitView,
      },
      {
        id: 'reset-zoom',
        label: 'Reset Zoom',
        shortcut: '0',
        action: handleZoomReset,
      },
      {
        id: 'toggle-sidebar',
        label: 'Toggle Sidebar',
        shortcut: 'Ctrl/Cmd + B',
        action: handleToggleSidebar,
      },
      {
        id: 'toggle-properties',
        label: 'Toggle Properties Panel',
        shortcut: 'Ctrl/Cmd + P',
        action: handleToggleProperties,
      },
      {
        id: 'theme-light',
        label: 'Switch to Light Theme',
        shortcut: 'Ctrl/Cmd + Shift + L',
        action: () => setTheme('light'),
      },
      {
        id: 'theme-dark',
        label: 'Switch to Dark Theme',
        shortcut: 'Ctrl/Cmd + Shift + D',
        action: () => setTheme('dark'),
      },
      {
        id: 'open-command-palette',
        label: 'Open Command Palette',
        shortcut: 'Ctrl/Cmd + K',
        action: () => setIsCommandPaletteOpen(true),
      },
      {
        id: 'open-shortcuts-help',
        label: 'Show Keyboard Shortcuts',
        shortcut: '?',
        action: () => setIsShortcutsHelpOpen(true),
      },
    ],
    [
      handleParse,
      historyActions.undo,
      historyActions.redo,
      handleZoomIn,
      handleZoomOut,
      handleFitView,
      handleZoomReset,
      handleToggleSidebar,
      handleToggleProperties,
      setTheme,
    ]
  )

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-slate-900 hide-scrollbar">
      {/* Toolbar */}
      <Toolbar
        onParse={handleParse}
        onUndo={historyActions.undo}
        onRedo={historyActions.redo}
        canUndo={historyActions.canUndo}
        canRedo={historyActions.canRedo}
        onExportSVG={handleExportSVG}
        onExportPNG={handleExportPNG}
        onExportSQL={handleExportSQL}
        onSaveProject={handleSaveProject}
        onOpenProject={handleOpenProject}
        currentLayout={currentLayout}
        onLayoutChange={handleLayoutChange}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleZoomReset}
        onFitView={handleFitView}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      {/* Main content */}
      <PanelGroup
        orientation="horizontal"
        id="erd-layout-persistence"
        className="flex-1 overflow-hidden"
      >
        {/* Left Sidebar */}
        <Panel
          panelRef={sidebarRef}
          defaultSize={250}
          minSize={250}
          maxSize={700}
          collapsible
          onResize={() => {
            setIsSidebarCollapsed(sidebarRef.current?.isCollapsed() ?? false)
          }}
          id="sidebar"
        >
          <Sidebar
            graph={graph}
            selectedGroups={selectedGroups}
            selectedNodes={selectedNodes}
            onSelectNode={(nodeId) => setSelectedNodes(new Set([nodeId]))}
            onSelectGroup={(groupId) => setSelectedGroups(new Set([groupId]))}
            onCreateGroup={handleCreateGroup}
            onDeleteGroup={handleDeleteGroup}
            onAddToGroup={handleAddToGroup}
            onRemoveFromGroup={handleRemoveFromGroup}
            onToggleGroupCollapse={handleToggleGroupCollapse}
            onImportDSL={handleImportDSL}
            onImportTypeScript={handleImportTypeScript}
            onImportSchema={(schema) => {
              try {
                setSchema(schema)
                setError(null)
                const newGraph = buildGraph(schema)
                const layouted = layoutGraph(newGraph, currentLayout, { direction: 'LR' })
                const merged = mergeGroupsIntoLayout(layouted)
                historyActions.set(merged)
                try {
                  saveToLocalStorage(dsl, merged, schema)
                } catch {
                  // ignore
                }
              } catch (e) {
                setError({
                  message: e instanceof Error ? e.message : 'Import error',
                  line: 0,
                  column: 0,
                })
              }
            }}
            showGrid={showGrid}
            onShowGridChange={setShowGrid}
            snapToGrid={snapToGrid}
            onSnapToGridChange={setSnapToGrid}
            gridSize={gridSize}
            onGridSizeChange={setGridSize}
            theme={theme}
            onThemeChange={setTheme}
            language={settings.general.language}
            onLanguageChange={(language) =>
              setSettings((prev) => ({
                ...prev,
                general: {
                  ...prev.general,
                  language,
                },
              }))
            }
            autoSaveIntervalMs={settings.general.autoSaveIntervalMs}
            onAutoSaveIntervalChange={(ms) =>
              setSettings((prev) => ({
                ...prev,
                general: {
                  ...prev.general,
                  autoSaveIntervalMs: ms,
                },
              }))
            }
            zoomSpeed={settings.canvas.zoomSpeed}
            onZoomSpeedChange={(speed) =>
              setSettings((prev) => ({
                ...prev,
                canvas: {
                  ...prev.canvas,
                  zoomSpeed: speed,
                },
              }))
            }
            defaultSQLDialect={settings.export.defaultSQLDialect}
            onDefaultSQLDialectChange={(dialect) =>
              setSettings((prev) => ({
                ...prev,
                export: {
                  ...prev.export,
                  defaultSQLDialect: dialect,
                },
              }))
            }
            imageScale={settings.export.imageScale}
            onImageScaleChange={(scale) =>
              setSettings((prev) => ({
                ...prev,
                export: {
                  ...prev.export,
                  imageScale: scale,
                },
              }))
            }
            settingsJSON={JSON.stringify(settings, null, 2)}
            onSettingsImportFromJSON={(json) => {
              try {
                const imported = JSON.parse(json) as AppSettings
                setSettings(imported)
                // Sync critical UI state with imported settings
                setTheme(imported.general.theme)
                setShowGrid(imported.canvas.showGrid)
                setSnapToGrid(imported.canvas.snapToGrid)
                setGridSize(imported.canvas.gridSize)
                if (imported.canvas.showPerformanceOverlay !== undefined) {
                  setShowPerformanceOverlay(imported.canvas.showPerformanceOverlay)
                }
                if (imported.canvas.curvature !== undefined) {
                  setCurvature(imported.canvas.curvature)
                }
              } catch (e) {
                console.error('Failed to import settings JSON:', e)
              }
            }}
            dsl={dsl}
            onDslChange={setDsl}
            error={error}
            schema={schema}
            onGenerateLargeSchema={handleGenerateLargeSchema}
            showPerformanceOverlay={showPerformanceOverlay}
            onShowPerformanceOverlayChange={setShowPerformanceOverlay}
            curvature={curvature}
            onCurvatureChange={setCurvature}
            versionHistory={versionHistory}
            onRestoreSnapshot={handleRestoreSnapshot}
            onDeleteSnapshot={deleteSnapshot}
            onSaveSnapshot={handleSaveSnapshot}
          />
        </Panel>

        <ResizeHandle>
          {!isSidebarCollapsed && (
            <button
              onClick={() => {
                sidebarRef.current?.collapse()
                setIsSidebarCollapsed(true)
              }}
              title="Close Sidebar"
              aria-label="Close Sidebar"
              className="absolute left-0 top-20 z-50 -translate-x-1/2 px-1 py-4 rounded-r-md bg-white dark:bg-slate-800 border-y border-r border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-500 shadow-md transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              style={{ width: '20px' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
        </ResizeHandle>

        {/* Floating toggle for Sidebar (only when collapsed) */}
        {isSidebarCollapsed && (
          <button
            onClick={() => {
              sidebarRef.current?.expand()
              setIsSidebarCollapsed(false)
            }}
            title="Open Sidebar"
            aria-label="Open Sidebar"
            className="fixed left-0 top-20 z-50 px-1 py-4 rounded-r-md bg-white dark:bg-slate-800 border-y border-r border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-500 shadow-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Canvas */}
        <Panel minSize={30} id="canvas">
          <div ref={svgRef} className="h-full w-full overflow-hidden relative">
            <ERDCanvas
              graph={graph}
              onGraphChange={handleGraphChange}
              selectedNodes={selectedNodes}
              selectedEdges={selectedEdges}
              selectedGroups={selectedGroups}
              onSelectionChange={handleSelectionChange}
              zoom={zoom}
              onZoomChange={setZoom}
              panX={pan.x}
              panY={pan.y}
              onPanChange={(x, y) => setPan({ x, y })}
              onViewChange={({ panX, panY, zoom }) => {
                // update app-level pan/zoom so minimap and other UI stay in sync
                setPan({ x: panX, y: panY })
                setZoom(zoom)
                const rect = svgRef.current?.getBoundingClientRect()
                if (rect) setViewportSize({ width: rect.width, height: rect.height })
              }}
              curvature={curvature}
            />

            {/* Zoom Controls Overlay */}
            <ZoomControls
              zoom={zoom}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onZoomReset={handleZoomReset}
            />

            {/* Mini-map */}
            <MiniMap
              graph={graph}
              view={{
                panX: pan.x,
                panY: pan.y,
                zoom,
                width: viewportSize.width,
                height: viewportSize.height,
              }}
              onNavigate={(x, y) => setPan({ x, y })}
            />
          </div>
        </Panel>

        <ResizeHandle />

        {/* Right Property Panel */}
        <Panel
          panelRef={propertiesRef}
          defaultSize={300}
          minSize={150}
          maxSize={300}
          collapsible
          id="properties"
          onResize={() => {
            setIsPropertiesCollapsed(propertiesRef.current?.isCollapsed() ?? false)
          }}
        >
          <PropertyPanel
            selectedTable={selectedTable}
            selectedEdge={selectedEdge}
            selectedGroup={selectedGroup}
            onTableUpdate={handleTableUpdate}
            onColumnUpdate={handleColumnUpdate}
            onEdgeUpdate={handleEdgeUpdate}
            onGroupUpdate={handleGroupUpdate}
            groups={graph.groups}
            onAssignTableToGroup={handleAssignTableToGroup}
          />
        </Panel>
      </PanelGroup>

      {/* Status bar */}
      <footer className="h-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center px-4 text-xs text-slate-500 dark:text-slate-400 shrink-0">
        <span>
          {graph.nodes.length} tables • {graph.edges.length} relations
          {selectedNodes.size > 0 && ` • ${selectedNodes.size} selected`}
        </span>

        <span className="ml-auto">
          Zoom: {Math.round(zoom * 100)}% • Shortcuts: F fit • 0 reset • Ctrl/Cmd +/- zoom •
          Ctrl/Cmd+K palette • ? help
        </span>
      </footer>

      {/* Overlays */}
      <CommandPalette
        open={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commands}
      />
      <ShortcutsHelpModal
        open={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
      />
      {showPerformanceOverlay && (
        <PerformanceOverlay nodeCount={graph.nodes.length} edgeCount={graph.edges.length} />
      )}
    </div>
  )
}
