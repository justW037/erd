/**
 * SVG Table Node Component
 *
 * Renders a single table as an SVG group with header and columns.
 * Memoized for performance optimization with large schemas.
 */

import React, { useCallback, memo } from 'react'
import type { TableNode, ColumnNode } from '../../core/graph/types'

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

// Colors are sourced from CSS variables to support dark mode
const CSS = {
  headerBg: 'var(--node-header-bg)',
  headerText: 'var(--node-header-text)',
  bodyBg: 'var(--node-body-bg)',
  bodyText: 'var(--node-body-text)',
  border: 'var(--node-border)',
  borderSelected: 'var(--node-header-bg)',
  pkIcon: 'var(--node-pk)',
  fkIcon: 'var(--node-fk)',
  meta: 'var(--node-meta)',
}

const HEADER_HEIGHT = 32
const COLUMN_HEIGHT = 24
const BORDER_RADIUS = 6
const FONT_SIZE = 12
const FONT_FAMILY = 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace'

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface TableNodeProps {
  node: TableNode
  selected?: boolean
  onSelect?: (nodeId: string, multi: boolean) => void
  onDragStart?: (nodeId: string, startX: number, startY: number) => void
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export const TableNodeSVG: React.FC<TableNodeProps> = ({
  node,
  selected = false,
  onSelect,
  onDragStart,
}) => {
  const { position, size, name, columns } = node

  const isCollapsed = node.collapsed ?? false
  const renderHeight = isCollapsed ? HEADER_HEIGHT : size.height

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onSelect?.(node.id, e.shiftKey || e.metaKey)
      onDragStart?.(node.id, e.clientX, e.clientY)
    },
    [node.id, onSelect, onDragStart]
  )

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      onMouseDown={handleMouseDown}
      style={{ cursor: 'move' }}
      data-node-id={node.id}
    >
      {/* Shadow */}
      <rect
        x={2}
        y={2}
        width={size.width}
        height={renderHeight}
        rx={BORDER_RADIUS}
        fill="rgba(0,0,0,0.1)"
      />

      {/* Body background */}
      <rect
        x={0}
        y={0}
        width={size.width}
        height={renderHeight}
        rx={BORDER_RADIUS}
        fill={CSS.bodyBg}
        stroke={selected ? CSS.borderSelected : CSS.border}
        strokeWidth={selected ? 2 : 1}
      />

      {/* Header background */}
      <rect
        x={0}
        y={0}
        width={size.width}
        height={HEADER_HEIGHT}
        rx={BORDER_RADIUS}
        fill={node.color ?? CSS.headerBg}
      />
      {/* Cover bottom corners of header */}
      <rect
        x={0}
        y={HEADER_HEIGHT - BORDER_RADIUS}
        width={size.width}
        height={BORDER_RADIUS}
        fill={node.color ?? CSS.headerBg}
      />

      {/* Header text */}
      <text
        x={size.width / 2}
        y={HEADER_HEIGHT / 2 + 4}
        textAnchor="middle"
        fill={CSS.headerText}
        fontSize={FONT_SIZE + 1}
        fontFamily={FONT_FAMILY}
        fontWeight="600"
      >
        {name}
      </text>

      {/* Columns (hidden when collapsed) */}
      {!isCollapsed &&
        columns.map((col, idx) => (
          <ColumnRow key={col.id} column={col} index={idx} width={size.width} />
        ))}
    </g>
  )
}

// ─────────────────────────────────────────────────────────────
// Column Row
// ─────────────────────────────────────────────────────────────

interface ColumnRowProps {
  column: ColumnNode
  index: number
  width: number
}

const ColumnRow: React.FC<ColumnRowProps> = memo(({ column, index, width }) => {
  const y = HEADER_HEIGHT + index * COLUMN_HEIGHT

  return (
    <g transform={`translate(0, ${y})`}>
      {/* Separator line */}
      <line x1={0} y1={0} x2={width} y2={0} stroke={CSS.border} strokeWidth={0.5} />

      {/* PK/FK icons */}
      {column.isPrimaryKey && (
        <g>
          <title>Primary Key</title>
          <text
            x={8}
            y={COLUMN_HEIGHT / 2 + 4}
            fill={CSS.pkIcon}
            fontSize={10}
            fontFamily={FONT_FAMILY}
          >
            🔑
          </text>
        </g>
      )}
      {column.isForeignKey && !column.isPrimaryKey && (
        <g>
          <title>Foreign Key</title>
          <text
            x={8}
            y={COLUMN_HEIGHT / 2 + 4}
            fill={CSS.fkIcon}
            fontSize={10}
            fontFamily={FONT_FAMILY}
          >
            🔗
          </text>
        </g>
      )}

      {/* Column name */}
      <text
        x={column.isPrimaryKey || column.isForeignKey ? 28 : 10}
        y={COLUMN_HEIGHT / 2 + 4}
        fill={CSS.bodyText}
        fontSize={FONT_SIZE}
        fontFamily={FONT_FAMILY}
      >
        {column.name}
        {!column.isNullable && <tspan fill="#ef4444">*</tspan>}
      </text>

      {/* Column type */}
      <text
        x={width - 10}
        y={COLUMN_HEIGHT / 2 + 4}
        textAnchor="end"
        fill={CSS.meta}
        fontSize={FONT_SIZE - 1}
        fontFamily={FONT_FAMILY}
      >
        {column.type}
      </text>
    </g>
  )
})

ColumnRow.displayName = 'ColumnRow'

// Memoized TableNodeSVG for performance
export default memo(TableNodeSVG, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.node.id === nextProps.node.id &&
    prevProps.node.position.x === nextProps.node.position.x &&
    prevProps.node.position.y === nextProps.node.position.y &&
    prevProps.selected === nextProps.selected &&
    prevProps.node.columns.length === nextProps.node.columns.length &&
    (prevProps.node.collapsed ?? false) === (nextProps.node.collapsed ?? false) &&
    prevProps.node.size.width === nextProps.node.size.width &&
    prevProps.node.size.height === nextProps.node.size.height
  )
})
