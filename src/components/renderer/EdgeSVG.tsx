/**
 * SVG Edge Component
 *
 * Renders a relationship edge between two table nodes.
 * Shows cardinality markers (crow's foot notation) and orthogonal routing.
 */

import React, { memo, useState } from 'react'
import type { Edge, TableNode, Point } from '../../core/graph/types'

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const COLORS = {
  line: '#6b7280',
  lineSelected: '#3b82f6',
  lineHover: '#9ca3af',
  marker: '#374151',
  dot: 'rgba(59, 130, 246, 0.5)',
}

const COLUMN_HEIGHT = 24
const HEADER_HEIGHT = 32
const CORNER_RADIUS = 8

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface EdgeSVGProps {
  edge: Edge
  nodes: TableNode[]
  selected?: boolean
  onSelect?: (edgeId: string) => void
  onUpdate?: (edgeId: string, updates: Partial<Edge>) => void
  globalCurvature?: number
  /** When true, force display of the edge label (e.g. node selected) */
  showLabel?: boolean
  /** True when either endpoint node is selected (used for stronger highlight) */
  endpointSelected?: boolean
}

// ─────────────────────────────────────────────────────────────
// Path Builders
// ─────────────────────────────────────────────────────────────

interface PathResult {
  path: string
  segments: { p1: Point; p2: Point }[]
  midPoint: Point
}

function buildOrthogonalPath(from: Point, to: Point, curvature: number): PathResult {
  // Step 1: Calculate the intermediate X position based on curvature
  const horizontalGap = to.x - from.x
  const midX = from.x + horizontalGap * (curvature / 2)

  // Points for 3-segment orthogonal path
  const p1 = from
  const p2 = { x: midX, y: from.y }
  const p3 = { x: midX, y: to.y }
  const p4 = to

  // Rounded corner helper (Quadratic Bezier)
  const r = Math.min(CORNER_RADIUS, Math.abs(horizontalGap) / 2, Math.abs(to.y - from.y) / 2)

  // Build path string with L and Q for rounded corners
  let d = `M ${p1.x} ${p1.y} `

  // Segment 1 (H) to Corner 1
  if (Math.abs(midX - from.x) > r) {
    const cornerX = midX > from.x ? midX - r : midX + r
    d += `L ${cornerX} ${p1.y} `
    d += `Q ${midX} ${p1.y}, ${midX} ${p1.y + (to.y > from.y ? r : -r)} `
  } else {
    d += `L ${midX} ${p1.y} `
  }

  // Segment 2 (V) to Corner 2
  if (Math.abs(to.y - from.y) > 2 * r) {
    const cornerY = to.y > from.y ? to.y - r : to.y + r
    d += `L ${midX} ${cornerY} `
    d += `Q ${midX} ${to.y}, ${midX + (to.x > midX ? r : -r)} ${to.y} `
  } else {
    d += `L ${midX} ${to.y} `
  }

  // Segment 3 (H) to End
  d += `L ${p4.x} ${p4.y}`

  return {
    path: d,
    segments: [
      { p1, p2 },
      { p1: p2, p2: p3 },
      { p1: p3, p2: p4 },
    ],
    midPoint: { x: midX, y: (from.y + to.y) / 2 },
  }
}

// ─────────────────────────────────────────────────────────────
// Decorative Dots
// ─────────────────────────────────────────────────────────────

interface EdgeDotsProps {
  segments: { p1: Point; p2: Point }[]
  active: boolean
}

const EdgeDots: React.FC<EdgeDotsProps> = ({ segments, active }) => {
  const dotSpacing = 16
  const dots: Point[] = []

  segments.forEach((seg) => {
    const dx = seg.p2.x - seg.p1.x
    const dy = seg.p2.y - seg.p1.y
    const len = Math.sqrt(dx * dx + dy * dy)
    const count = Math.floor(len / dotSpacing)

    for (let i = 1; i < count; i++) {
      const t = i / count
      dots.push({
        x: seg.p1.x + dx * t,
        y: seg.p1.y + dy * t,
      })
    }
  })

  return (
    <g
      className={`transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-20 group-hover:opacity-100'}`}
    >
      {dots.map((dot, i) => (
        <rect
          key={i}
          x={dot.x - 1.5}
          y={dot.y - 1.5}
          width={3}
          height={3}
          rx={1}
          fill={active ? COLORS.lineSelected : COLORS.line}
          opacity={0.6}
        />
      ))}
    </g>
  )
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

const EdgeSVGInner: React.FC<EdgeSVGProps> = ({
  edge,
  nodes,
  selected = false,
  onSelect,
  onUpdate,
  globalCurvature = 1.0,
  showLabel = false,
  endpointSelected = false,
}) => {
  const [hover, setHover] = useState(false)
  const fromNode = nodes.find((n) => n.id === edge.from.nodeId)
  const toNode = nodes.find((n) => n.id === edge.to.nodeId)

  if (!fromNode || !toNode) return null

  // Find column Y positions
  const fromColIndex = fromNode.columns.findIndex((c) => c.id === edge.from.columnId)
  const toColIndex = toNode.columns.findIndex((c) => c.id === edge.to.columnId)

  // Calculate anchor points
  const fromY =
    fromNode.position.y + HEADER_HEIGHT + fromColIndex * COLUMN_HEIGHT + COLUMN_HEIGHT / 2
  const toY = toNode.position.y + HEADER_HEIGHT + toColIndex * COLUMN_HEIGHT + COLUMN_HEIGHT / 2

  // Determine which side to connect from
  const fromCenterX = fromNode.position.x + fromNode.size.width / 2
  const toCenterX = toNode.position.x + toNode.size.width / 2

  let fromX: number, toX: number, fromSide: 'left' | 'right', toSide: 'left' | 'right'

  if (fromCenterX < toCenterX) {
    fromX = fromNode.position.x + fromNode.size.width
    toX = toNode.position.x
    fromSide = 'right'
    toSide = 'left'
  } else {
    fromX = fromNode.position.x
    toX = toNode.position.x + toNode.size.width
    fromSide = 'left'
    toSide = 'right'
  }

  // Use curvature for the horizontal offset of the vertical segment
  const currentCurvature = edge.curvature ?? globalCurvature

  // Build Orthogonal Path
  const { path, segments, midPoint } = buildOrthogonalPath(
    { x: fromX, y: fromY },
    { x: toX, y: toY },
    currentCurvature
  )

  const handleDragStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (!selected) {
      onSelect?.(edge.id)
    }

    const startX = e.clientX
    const startCurvature = currentCurvature

    // Total distance between nodes for normalization
    const totalDist = Math.max(100, Math.abs(toX - fromX))

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startX) / totalDist
      // Sensitivity factor
      const sensitivity = 2.0
      let newCurvature = startCurvature + dx * sensitivity

      // Clamp between 0 and 2 (0% to 200% width)
      newCurvature = Math.max(0, Math.min(2, newCurvature))

      // Snapping to 0.05
      newCurvature = Math.round(newCurvature * 20) / 20
      onUpdate?.(edge.id, { curvature: newCurvature })
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <g
      className="edge-group group"
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.(edge.id)
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Invisible wider path for easier clicking and dragging */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        onMouseDown={handleDragStart}
      />

      {/* Decorative Dots (like in the image) */}
      <EdgeDots segments={segments} active={selected || showLabel || hover || endpointSelected} />

      {/* Visible path */}
      <path
        d={path}
        fill="none"
        stroke={
          selected
            ? COLORS.lineSelected
            : endpointSelected
              ? COLORS.lineSelected
              : showLabel || hover
                ? COLORS.lineHover
                : COLORS.line
        }
        strokeWidth={selected || endpointSelected ? 2.5 : 1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        markerEnd={`url(#${getMarkerEndId(edge.type)})`}
        markerStart={`url(#${getMarkerStartId(edge.type)})`}
        className="transition-colors duration-200"
      />

      {/* Curvature Handle (midpoint of the vertical segment) */}
      {selected && (
        <circle
          cx={midPoint.x}
          cy={midPoint.y}
          r={6}
          fill="white"
          stroke={COLORS.lineSelected}
          strokeWidth={2}
          onMouseDown={handleDragStart}
          style={{ cursor: 'ew-resize' }}
        />
      )}

      {/* Label */}
      {(() => {
        const labelText = edge.label ?? `${fromNode.name}_${toNode.name}`
        const shouldShow = Boolean(edge.label) || selected || showLabel || hover
        if (!shouldShow) return null

        const estCharWidth = 7
        const padding = 8
        const width = Math.max(40, labelText.length * estCharWidth + padding * 2)
        const height = 20
        const x = midPoint.x - width / 2
        const y = midPoint.y - height - 8

        return (
          <g className="edge-label-group" pointerEvents="none">
            <rect x={x} y={y} width={width} height={height} rx={8} fill="#111827" opacity={0.9} />
            <text
              x={midPoint.x}
              y={y + height / 2 + 5}
              textAnchor="middle"
              fontSize={12}
              fill="#f8fafc"
              fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue'"
            >
              {labelText}
            </text>
          </g>
        )
      })()}
    </g>
  )
}

// ─────────────────────────────────────────────────────────────
// Marker IDs
// ─────────────────────────────────────────────────────────────

function getMarkerEndId(type: Edge['type']): string {
  switch (type) {
    case 'one-to-one':
      return 'marker-one'
    case 'one-to-many':
      return 'marker-many'
    case 'many-to-one':
      return 'marker-one'
    case 'many-to-many':
      return 'marker-many'
    default:
      return 'marker-one'
  }
}

function getMarkerStartId(type: Edge['type']): string {
  switch (type) {
    case 'one-to-one':
      return 'marker-one'
    case 'one-to-many':
      return 'marker-one'
    case 'many-to-one':
      return 'marker-many'
    case 'many-to-many':
      return 'marker-many'
    default:
      return 'marker-one'
  }
}

// ─────────────────────────────────────────────────────────────
// Marker Definitions
// ─────────────────────────────────────────────────────────────

export const EdgeMarkerDefs: React.FC = () => (
  <defs>
    <marker
      id="marker-one"
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerWidth="8"
      markerHeight="8"
      orient="auto-start-reverse"
    >
      <line x1="0" y1="0" x2="0" y2="10" stroke={COLORS.marker} strokeWidth="2" />
    </marker>

    <marker
      id="marker-many"
      viewBox="0 0 12 12"
      refX="11"
      refY="6"
      markerWidth="10"
      markerHeight="10"
      orient="auto-start-reverse"
    >
      <path
        d="M 0 6 L 10 0 M 0 6 L 10 6 M 0 6 L 10 12"
        stroke={COLORS.marker}
        strokeWidth="1.5"
        fill="none"
      />
    </marker>
  </defs>
)

export const EdgeSVG = memo(EdgeSVGInner, (prevProps, nextProps) => {
  const prevFrom = prevProps.nodes.find((n) => n.id === prevProps.edge.from.nodeId)
  const prevTo = prevProps.nodes.find((n) => n.id === prevProps.edge.to.nodeId)
  const nextFrom = nextProps.nodes.find((n) => n.id === nextProps.edge.from.nodeId)
  const nextTo = nextProps.nodes.find((n) => n.id === nextProps.edge.to.nodeId)

  return (
    prevProps.edge.id === nextProps.edge.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.edge.curvature === nextProps.edge.curvature &&
    prevProps.globalCurvature === nextProps.globalCurvature &&
    prevProps.edge.label === nextProps.edge.label &&
    prevProps.showLabel === nextProps.showLabel &&
    prevProps.endpointSelected === nextProps.endpointSelected &&
    prevFrom?.position.x === nextFrom?.position.x &&
    prevFrom?.position.y === nextFrom?.position.y &&
    prevTo?.position.x === nextTo?.position.x &&
    prevTo?.position.y === nextTo?.position.y
  )
})
