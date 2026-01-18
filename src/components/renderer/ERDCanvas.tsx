/**
 * ERD Canvas Component
 *
 * Interactive SVG canvas with:
 * - Pan (drag background)
 * - Zoom (scroll wheel)
 * - Node dragging
 * - Selection
 */

import React, { useRef, useState, useCallback, useEffect } from 'react'
import type { Graph, TableNode, Point, Edge, TableGroup, StickyNote } from '../../core/graph/types'
import { TableNodeSVG } from './TableNodeSVG'
import { EdgeSVG, EdgeMarkerDefs } from './EdgeSVG'
import { TableGroupSVG } from './TableGroupSVG'
import { StickyNoteSVG } from './StickyNoteSVG'
import { computeGraphBounds } from '../../core/graph'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface CanvasState {
  panX: number
  panY: number
  zoom: number
}

interface DragState {
  isDragging: boolean
  nodeId: string | null
  groupId: string | null
  noteId: string | null
  startX: number
  startY: number
  startNodeX: number
  startNodeY: number
  startNoteX: number
  startNoteY: number
  /** For group dragging, we need to store initial positions of all tables in group */
  startGroupNodes?: { id: string; x: number; y: number }[]
  /** For group resizing */
  resizing?: boolean
  resizeCorner?: 'nw' | 'ne' | 'sw' | 'se'
  startBounds?: { x: number; y: number; width: number; height: number }
}

interface ERDCanvasProps {
  graph: Graph
  onGraphChange?: (graph: Graph) => void
  selectedNodes?: Set<string>
  selectedEdges?: Set<string>
  selectedGroups?: Set<string>
  selectedNotes?: Set<string>
  onSelectionChange?: (
    nodes: Set<string>,
    edges: Set<string>,
    groups: Set<string>,
    notes: Set<string>
  ) => void
  /** Optional external zoom control. If provided, canvas will sync zoom with this value. */
  zoom?: number
  onZoomChange?: (zoom: number) => void
  /** Optional external pan state (top-left translate) */
  panX?: number
  panY?: number
  onPanChange?: (x: number, y: number) => void
  /** Notify parent about view changes (pan/zoom) */
  onViewChange?: (state: CanvasState) => void
  /** Global edge curvature setting */
  curvature?: number
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const MIN_ZOOM = 0.1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.1

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export const ERDCanvas: React.FC<ERDCanvasProps> = ({
  graph,
  onGraphChange,
  selectedNodes = new Set(),
  selectedEdges = new Set(),
  selectedGroups = new Set(),
  selectedNotes = new Set(),
  onSelectionChange,
  zoom,
  onZoomChange,
  panX,
  panY,
  onPanChange,
  onViewChange,
  curvature = 1.0,
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [canvas, setCanvas] = useState<CanvasState>({
    panX: panX ?? 0,
    panY: panY ?? 0,
    zoom: zoom ?? 1,
  })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 })
  const [drag, setDrag] = useState<DragState>({
    isDragging: false,
    nodeId: null,
    groupId: null,
    noteId: null,
    startX: 0,
    startY: 0,
    startNodeX: 0,
    startNodeY: 0,
    startNoteX: 0,
    startNoteY: 0,
  })

  // ─────────────────────────────────────────────────────────
  // Zoom handler
  // ─────────────────────────────────────────────────────────

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      setCanvas((prev) => {
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom + delta))
        // notify external controller if present
        onZoomChange?.(newZoom)
        return { ...prev, zoom: newZoom }
      })
    },
    [onZoomChange]
  )

  // ─────────────────────────────────────────────────────────
  // Pan handlers
  // ─────────────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only pan if clicking on background (not a node)
      if (
        (e.target as Element).tagName === 'svg' ||
        (e.target as Element).classList.contains('canvas-bg')
      ) {
        setIsPanning(true)
        setPanStart({ x: e.clientX - canvas.panX, y: e.clientY - canvas.panY })
        // Clear selection when clicking background
        onSelectionChange?.(new Set(), new Set(), new Set(), new Set())
      }
    },
    [canvas.panX, canvas.panY, onSelectionChange]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const newX = e.clientX - panStart.x
        const newY = e.clientY - panStart.y
        setCanvas((prev) => ({ ...prev, panX: newX, panY: newY }))
        onPanChange?.(newX, newY)
      } else if (drag.isDragging) {
        const dx = (e.clientX - drag.startX) / canvas.zoom
        const dy = (e.clientY - drag.startY) / canvas.zoom

        if (drag.resizing && drag.groupId && drag.startBounds) {
          // Resize group bounds based on corner
          const minW = 40
          const minH = 28
          const sb = drag.startBounds
          let nx = sb.x
          let ny = sb.y
          let nw = sb.width
          let nh = sb.height

          switch (drag.resizeCorner) {
            case 'nw':
              nx = sb.x + dx
              ny = sb.y + dy
              nw = sb.width - dx
              nh = sb.height - dy
              break
            case 'ne':
              ny = sb.y + dy
              nw = sb.width + dx
              nh = sb.height - dy
              break
            case 'sw':
              nx = sb.x + dx
              nw = sb.width - dx
              nh = sb.height + dy
              break
            case 'se':
            default:
              nw = sb.width + dx
              nh = sb.height + dy
              break
          }

          // enforce minimum
          if (nw < minW) nw = minW
          if (nh < minH) nh = minH

          const updatedGroups = graph.groups.map((g) =>
            g.id === drag.groupId ? { ...g, bounds: { x: nx, y: ny, width: nw, height: nh } } : g
          )
          onGraphChange?.({ ...graph, groups: updatedGroups })
          return
        }

        if (drag.nodeId) {
          const updatedNodes = graph.nodes.map((node) => {
            if (node.id === drag.nodeId) {
              return {
                ...node,
                position: {
                  x: drag.startNodeX + dx,
                  y: drag.startNodeY + dy,
                },
              }
            }
            return node
          })
          const updatedGraph = computeGraphBounds({ ...graph, nodes: updatedNodes })
          onGraphChange?.(updatedGraph)
        } else if (drag.groupId && drag.startGroupNodes) {
          // Dragging a group: move all nodes in it
          const updatedNodes = graph.nodes.map((node) => {
            const startPos = drag.startGroupNodes?.find((sn) => sn.id === node.id)
            if (startPos) {
              return {
                ...node,
                position: {
                  x: startPos.x + dx,
                  y: startPos.y + dy,
                },
              }
            }
            return node
          })
          const updatedGraph = computeGraphBounds({ ...graph, nodes: updatedNodes })
          onGraphChange?.(updatedGraph)
        } else if (drag.noteId) {
          // Handle sticky note dragging and resizing
          if (drag.resizing && drag.startBounds) {
            // Resize sticky note
            const minW = 80
            const minH = 60
            const sb = drag.startBounds
            let nx = sb.x
            let ny = sb.y
            let nw = sb.width
            let nh = sb.height

            switch (drag.resizeCorner) {
              case 'nw':
                nx = sb.x + dx
                ny = sb.y + dy
                nw = sb.width - dx
                nh = sb.height - dy
                break
              case 'ne':
                ny = sb.y + dy
                nw = sb.width + dx
                nh = sb.height - dy
                break
              case 'sw':
                nx = sb.x + dx
                nw = sb.width - dx
                nh = sb.height + dy
                break
              case 'se':
              default:
                nw = sb.width + dx
                nh = sb.height + dy
                break
            }

            if (nw < minW) nw = minW
            if (nh < minH) nh = minH

            const updatedNotes = graph.notes.map((n) =>
              n.id === drag.noteId
                ? { ...n, position: { x: nx, y: ny }, size: { width: nw, height: nh } }
                : n
            )
            onGraphChange?.({ ...graph, notes: updatedNotes })
          } else {
            // Move sticky note
            const updatedNotes = graph.notes.map((note) => {
              if (note.id === drag.noteId) {
                return {
                  ...note,
                  position: {
                    x: drag.startNoteX + dx,
                    y: drag.startNoteY + dy,
                  },
                }
              }
              return note
            })
            onGraphChange?.({ ...graph, notes: updatedNotes })
          }
        }
      }
    },
    [isPanning, panStart, drag, canvas.zoom, graph, onGraphChange, computeGraphBounds]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    if (drag.isDragging) {
      setDrag((prev) => ({
        ...prev,
        isDragging: false,
        nodeId: null,
        groupId: null,
        noteId: null,
        resizing: false,
        resizeCorner: undefined,
        startBounds: undefined,
        startGroupNodes: undefined,
      }))
    }
  }, [drag.isDragging])

  // ─────────────────────────────────────────────────────────
  // Node drag start
  // ─────────────────────────────────────────────────────────

  const handleNodeDragStart = useCallback(
    (nodeId: string, startX: number, startY: number) => {
      const node = graph.nodes.find((n) => n.id === nodeId)
      if (node) {
        setDrag({
          isDragging: true,
          nodeId,
          groupId: null,
          startX,
          startY,
          startNodeX: node.position.x,
          startNodeY: node.position.y,
        })
      }
    },
    [graph.nodes]
  )

  const handleGroupDragStart = useCallback(
    (groupId: string, startX: number, startY: number) => {
      const group = graph.groups.find((g) => g.id === groupId)
      if (group) {
        const startGroupNodes = graph.nodes
          .filter((n) => group.nodeIds.includes(n.id))
          .map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }))

        setDrag({
          isDragging: true,
          nodeId: null,
          groupId,
          startX,
          startY,
          startNodeX: 0,
          startNodeY: 0,
          startGroupNodes,
        })
      }
    },
    [graph.groups, graph.nodes]
  )

  const handleGroupResizeStart = useCallback(
    (groupId: string, corner: 'nw' | 'ne' | 'sw' | 'se', startX: number, startY: number) => {
      const group = graph.groups.find((g) => g.id === groupId)
      if (!group || !group.bounds) return
      setDrag({
        isDragging: true,
        nodeId: null,
        groupId,
        startX,
        startY,
        startNodeX: 0,
        startNodeY: 0,
        resizing: true,
        resizeCorner: corner,
        startBounds: { ...group.bounds },
      })
    },
    [graph.groups]
  )

  // ─────────────────────────────────────────────────────────
  // Edge updates
  // ─────────────────────────────────────────────────────────

  const handleEdgeUpdate = useCallback(
    (edgeId: string, updates: Partial<Edge>) => {
      const updatedEdges = graph.edges.map((edge) => {
        if (edge.id === edgeId) {
          return { ...edge, ...updates }
        }
        return edge
      })
      onGraphChange?.({ ...graph, edges: updatedEdges })
    },
    [graph, onGraphChange]
  )

  // ─────────────────────────────────────────────────────────
  // Group updates (Task 44)
  // ─────────────────────────────────────────────────────────

  const handleGroupUpdate = useCallback(
    (groupId: string, updates: Partial<TableGroup>) => {
      const updatedGroups = (graph.groups || []).map((group) => {
        if (group.id === groupId) {
          return { ...group, ...updates }
        }
        return group
      })
      onGraphChange?.({ ...graph, groups: updatedGroups })
    },
    [graph, onGraphChange]
  )

  // ─────────────────────────────────────────────────────────
  // Selection handlers
  // ─────────────────────────────────────────────────────────

  const handleNodeSelect = useCallback(
    (nodeId: string, multi: boolean) => {
      const newSelection = new Set(multi ? selectedNodes : [])
      if (newSelection.has(nodeId)) {
        newSelection.delete(nodeId)
      } else {
        newSelection.add(nodeId)
      }
      onSelectionChange?.(newSelection, new Set(), new Set(), new Set())
    },
    [selectedNodes, selectedEdges, onSelectionChange]
  )

  const handleEdgeSelect = useCallback(
    (edgeId: string) => {
      const newSelection = new Set<string>([edgeId])
      onSelectionChange?.(new Set(), newSelection, new Set(), new Set())
    },
    [onSelectionChange]
  )

  const handleGroupSelect = useCallback(
    (groupId: string) => {
      const newSelection = new Set<string>([groupId])
      // When selecting a group, also select all nodes in it for visual cues
      const group = graph.groups.find((g) => g.id === groupId)
      const groupNodes = group ? new Set(group.nodeIds) : new Set<string>()
      onSelectionChange?.(groupNodes, new Set(), newSelection, new Set())
    },
    [graph.groups, onSelectionChange]
  )

  // ─────────────────────────────────────────────────────────
  // Sticky Note handlers (Task 45)
  // ─────────────────────────────────────────────────────────

  const handleNoteDragStart = useCallback(
    (noteId: string, startX: number, startY: number) => {
      const note = graph.notes.find((n) => n.id === noteId)
      if (note && !note.pinned) {
        setDrag({
          isDragging: true,
          nodeId: null,
          groupId: null,
          noteId,
          startX,
          startY,
          startNodeX: 0,
          startNodeY: 0,
          startNoteX: note.position.x,
          startNoteY: note.position.y,
        })
      }
    },
    [graph.notes]
  )

  const handleNoteResizeStart = useCallback(
    (noteId: string, corner: 'nw' | 'ne' | 'sw' | 'se', startX: number, startY: number) => {
      const note = graph.notes.find((n) => n.id === noteId)
      if (!note || note.pinned) return
      setDrag({
        isDragging: true,
        nodeId: null,
        groupId: null,
        noteId,
        startX,
        startY,
        startNodeX: 0,
        startNodeY: 0,
        resizing: true,
        resizeCorner: corner,
        startBounds: {
          x: note.position.x,
          y: note.position.y,
          width: note.size.width,
          height: note.size.height,
        },
      })
    },
    [graph.notes]
  )

  const handleNoteSelect = useCallback(
    (noteId: string) => {
      const newSelection = new Set<string>([noteId])
      onSelectionChange?.(new Set(), new Set(), new Set(), newSelection)
    },
    [onSelectionChange]
  )

  const handleNoteUpdate = useCallback(
    (noteId: string, updates: Partial<StickyNote>) => {
      const updatedNotes = (graph.notes || []).map((note) => {
        if (note.id === noteId) {
          return { ...note, ...updates }
        }
        return note
      })
      onGraphChange?.({ ...graph, notes: updatedNotes })
    },
    [graph, onGraphChange]
  )

  const handleNoteDelete = useCallback(
    (noteId: string) => {
      const updatedNotes = (graph.notes || []).filter((n) => n.id !== noteId)
      onGraphChange?.({ ...graph, notes: updatedNotes })
    },
    [graph, onGraphChange]
  )

  // ─────────────────────────────────────────────────────────
  // Keyboard shortcuts
  // ─────────────────────────────────────────────────────────

  // Sync external zoom -> internal canvas
  useEffect(() => {
    if (typeof zoom === 'number' && zoom !== canvas.zoom) {
      setCanvas((prev) => ({ ...prev, zoom }))
    }
  }, [zoom])

  // Sync external pan props into internal state
  useEffect(() => {
    if (
      (typeof panX === 'number' && panX !== canvas.panX) ||
      (typeof panY === 'number' && panY !== canvas.panY)
    ) {
      setCanvas((prev) => ({
        ...prev,
        panX: typeof panX === 'number' ? panX : prev.panX,
        panY: typeof panY === 'number' ? panY : prev.panY,
      }))
    }
  }, [panX, panY])

  // Notify parent when canvas state changes
  const lastViewRef = useRef<CanvasState | null>(null)
  useEffect(() => {
    const prev = lastViewRef.current
    if (
      !prev ||
      prev.panX !== canvas.panX ||
      prev.panY !== canvas.panY ||
      prev.zoom !== canvas.zoom
    ) {
      lastViewRef.current = { ...canvas }
      onViewChange?.(canvas)
    }
  }, [canvas, onViewChange])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Fit to view: F key
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey) {
        if (graph.bounds) {
          const svgRect = svgRef.current?.getBoundingClientRect()
          if (svgRect) {
            const scaleX = svgRect.width / graph.bounds.width
            const scaleY = svgRect.height / graph.bounds.height
            const zoom = Math.min(scaleX, scaleY, 1) * 0.9
            setCanvas({
              zoom,
              panX: (svgRect.width - graph.bounds.width * zoom) / 2 - graph.bounds.x * zoom,
              panY: (svgRect.height - graph.bounds.height * zoom) / 2 - graph.bounds.y * zoom,
            })
          }
        }
      }

      // Reset zoom: 0 key
      if (e.key === '0') {
        setCanvas({ panX: 0, panY: 0, zoom: 1 })
        onZoomChange?.(1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [graph.bounds])

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  return (
    <svg
      ref={svgRef}
      className="erd-canvas"
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--canvas-bg)',
        cursor: isPanning ? 'grabbing' : 'grab',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <EdgeMarkerDefs />

      {/* Grid pattern */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="var(--grid-dot)" />
        </pattern>
      </defs>

      {/* Background with grid */}
      <rect
        className="canvas-bg"
        x="-10000"
        y="-10000"
        width="20000"
        height="20000"
        fill="url(#grid)"
        transform={`translate(${canvas.panX}, ${canvas.panY}) scale(${canvas.zoom})`}
      />

      {/* Main content group with pan/zoom transform */}
      <g transform={`translate(${canvas.panX}, ${canvas.panY}) scale(${canvas.zoom})`}>
        {/* Table Groups (render behind everything) */}
        {(graph.groups || []).map((group) => (
          <TableGroupSVG
            key={group.id}
            group={group}
            selected={selectedGroups.has(group.id)}
            onSelect={handleGroupSelect}
            onDragStart={handleGroupDragStart}
            onResizeStart={handleGroupResizeStart}
            onUpdate={handleGroupUpdate}
          />
        ))}

        {/* Edges (render first, behind nodes) */}
        {(() => {
          // Determine which nodes are hidden due to collapsed groups
          const hiddenNodeIds = new Set<string>()
          for (const g of graph.groups || []) {
            if (g.collapsed) {
              for (const id of g.nodeIds) hiddenNodeIds.add(id)
            }
          }

          return (
            <>
              {graph.edges
                .filter(
                  (edge) =>
                    !hiddenNodeIds.has(edge.from.nodeId) && !hiddenNodeIds.has(edge.to.nodeId)
                )
                .map((edge) => {
                  const fromSelected = selectedNodes.has(edge.from.nodeId)
                  const toSelected = selectedNodes.has(edge.to.nodeId)
                  const showLabel = selectedEdges.has(edge.id) || fromSelected || toSelected
                  const endpointSelected = fromSelected || toSelected
                  return (
                    <EdgeSVG
                      key={edge.id}
                      edge={edge}
                      nodes={graph.nodes}
                      selected={selectedEdges.has(edge.id)}
                      onSelect={handleEdgeSelect}
                      onUpdate={handleEdgeUpdate}
                      globalCurvature={curvature}
                      showLabel={showLabel}
                      endpointSelected={endpointSelected}
                    />
                  )
                })}

              {/* Nodes */}
              {graph.nodes
                .filter((node) => !hiddenNodeIds.has(node.id))
                .map((node) => (
                  <TableNodeSVG
                    key={node.id}
                    node={node}
                    selected={selectedNodes.has(node.id)}
                    onSelect={handleNodeSelect}
                    onDragStart={handleNodeDragStart}
                  />
                ))}

              {/* Sticky Notes (render on top) */}
              {(graph.notes || [])
                .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
                .map((note) => (
                  <StickyNoteSVG
                    key={note.id}
                    note={note}
                    selected={selectedNotes.has(note.id)}
                    onSelect={handleNoteSelect}
                    onDragStart={handleNoteDragStart}
                    onResizeStart={handleNoteResizeStart}
                    onUpdate={handleNoteUpdate}
                    onDelete={handleNoteDelete}
                  />
                ))}
            </>
          )
        })()}
      </g>

      {/* Zoom indicator */}
      <text
        x="10"
        y="20"
        fill="var(--canvas-text)"
        fontSize="12"
        fontFamily="ui-monospace, monospace"
      >
        {Math.round(canvas.zoom * 100)}% | F: fit | 0: reset
      </text>
    </svg>
  )
}

export default ERDCanvas
