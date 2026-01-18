/**
 * TableGroupSVG Component (Task 44)
 *
 * Renders a colored box around a group of table nodes with:
 * - Header with group name
 * - Collapse/expand toggle
 * - Node count indicator
 * - Drag-to-move support
 */

import React, { memo, useCallback } from 'react'
import type { TableGroup } from '../../core/graph/types'

interface TableGroupSVGProps {
  group: TableGroup
  selected?: boolean
  onSelect?: (id: string) => void
  onDragStart?: (id: string, startX: number, startY: number) => void
  onResizeStart?: (
    id: string,
    corner: 'nw' | 'ne' | 'sw' | 'se',
    startX: number,
    startY: number
  ) => void
  onUpdate?: (id: string, updates: Partial<TableGroup>) => void
}

// Predefined color palette for groups
const GROUP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '#64748b': { bg: 'rgba(100, 116, 139, 0.08)', text: '#475569', border: '#64748b' }, // Slate
  '#3b82f6': { bg: 'rgba(59, 130, 246, 0.08)', text: '#2563eb', border: '#3b82f6' }, // Blue
  '#10b981': { bg: 'rgba(16, 185, 129, 0.08)', text: '#059669', border: '#10b981' }, // Green
  '#f59e0b': { bg: 'rgba(245, 158, 11, 0.08)', text: '#d97706', border: '#f59e0b' }, // Amber
  '#ef4444': { bg: 'rgba(239, 68, 68, 0.08)', text: '#dc2626', border: '#ef4444' }, // Red
  '#8b5cf6': { bg: 'rgba(139, 92, 246, 0.08)', text: '#7c3aed', border: '#8b5cf6' }, // Purple
  '#ec4899': { bg: 'rgba(236, 72, 153, 0.08)', text: '#db2777', border: '#ec4899' }, // Pink
}

const getGroupColors = (color?: string) => {
  const c = color || '#64748b'
  return GROUP_COLORS[c] || { bg: `${c}14`, text: c, border: c }
}

export const TableGroupSVG: React.FC<TableGroupSVGProps> = memo(
  ({ group, selected = false, onSelect, onDragStart, onResizeStart, onUpdate }) => {
    const { bounds } = group
    if (!bounds) return null

    const colors = getGroupColors(group.color)
    const headerHeight = 28
    const nodeCount = group.nodeIds.length
    const isCollapsed = group.collapsed ?? false

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (e.button === 0) {
          e.stopPropagation()
          onSelect?.(group.id)
          // Only start drag if not clicking on collapse button area
          const rect = (e.target as SVGElement).getBoundingClientRect()
          const relativeX = e.clientX - rect.left
          const isCollapseButton = relativeX > rect.width - 40
          if (!isCollapseButton) {
            onDragStart?.(group.id, e.clientX, e.clientY)
          }
        }
      },
      [group.id, onSelect, onDragStart]
    )

    const handleResizeMouseDown = useCallback(
      (corner: 'nw' | 'ne' | 'sw' | 'se') => (e: React.MouseEvent) => {
        e.stopPropagation()
        if (e.button !== 0) return
        onSelect?.(group.id)
        onResizeStart?.(group.id, corner, e.clientX, e.clientY)
      },
      [group.id, onSelect, onResizeStart]
    )

    const handleCollapseToggle = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onUpdate?.(group.id, { collapsed: !isCollapsed })
      },
      [group.id, isCollapsed, onUpdate]
    )

    const handleDoubleClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onUpdate?.(group.id, { collapsed: !isCollapsed })
      },
      [group.id, isCollapsed, onUpdate]
    )

    return (
      <g
        className="table-group"
        style={{
          opacity: isCollapsed ? 0.6 : 1,
          transition: 'opacity 0.2s ease-in-out',
        }}
      >
        {/* Group Background */}
        <rect
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={isCollapsed ? headerHeight + 8 : bounds.height}
          rx={8}
          ry={8}
          fill={colors.bg}
          stroke={colors.border}
          strokeWidth={selected ? 2.5 : 1.5}
          strokeDasharray={'none'}
          className="cursor-move"
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
        />

        {/* Header Bar */}
        <rect
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={headerHeight}
          rx={8}
          ry={8}
          fill={colors.border}
          fillOpacity={0.15}
          className="pointer-events-none"
        />
        {/* Clip bottom corners of header */}
        <rect
          x={bounds.x}
          y={bounds.y + headerHeight - 8}
          width={bounds.width}
          height={8}
          fill={colors.border}
          fillOpacity={0.15}
          className="pointer-events-none"
        />

        {/* Collapse/Expand Icon */}
        <g
          className="cursor-pointer"
          onClick={handleCollapseToggle}
          style={{ pointerEvents: 'all' }}
        >
          <rect
            x={bounds.x + 6}
            y={bounds.y + 6}
            width={16}
            height={16}
            rx={4}
            fill={colors.border}
            fillOpacity={0.2}
          />
          <path
            d={
              isCollapsed
                ? `M${bounds.x + 10} ${bounds.y + 11} l4 3 l4 -3` // Chevron right
                : `M${bounds.x + 10} ${bounds.y + 17} l4 -3 l4 3` // Chevron down
            }
            stroke={colors.text}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>

        {/* Group Name Label */}
        <text
          x={bounds.x + 28}
          y={bounds.y + 18}
          fill={colors.text}
          fontSize={12}
          fontWeight={600}
          fontFamily="system-ui, -apple-system, sans-serif"
          className="select-none pointer-events-none"
        >
          {group.name}
        </text>

        {/* Node Count Badge */}
        <g className="pointer-events-none">
          <rect
            x={bounds.x + bounds.width - 36}
            y={bounds.y + 6}
            width={28}
            height={16}
            rx={8}
            fill={colors.border}
            fillOpacity={0.2}
          />
          <text
            x={bounds.x + bounds.width - 22}
            y={bounds.y + 18}
            fill={colors.text}
            fontSize={10}
            fontWeight={500}
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {nodeCount}
          </text>
        </g>

        {/* Collapsed Indicator - shows table names when collapsed */}
        {isCollapsed && nodeCount > 0 && (
          <text
            x={bounds.x + 28}
            y={bounds.y + headerHeight + 3}
            fill={colors.text}
            fontSize={10}
            fontStyle="italic"
            opacity={0.6}
            className="select-none pointer-events-none"
          >
            {nodeCount} table{nodeCount > 1 ? 's' : ''} hidden
          </text>
        )}

        {/* Selection Indicator - corner handles */}
        {selected && (
          <>
            <circle cx={bounds.x} cy={bounds.y} r={4} fill={colors.border} />
            <circle cx={bounds.x + bounds.width} cy={bounds.y} r={4} fill={colors.border} />
            <circle
              cx={bounds.x}
              cy={bounds.y + (isCollapsed ? headerHeight + 8 : bounds.height)}
              r={4}
              fill={colors.border}
            />
            <circle
              cx={bounds.x + bounds.width}
              cy={bounds.y + (isCollapsed ? headerHeight + 8 : bounds.height)}
              r={4}
              fill={colors.border}
            />
            {/* Resize handles (in front) */}
            <rect
              x={bounds.x - 6}
              y={bounds.y - 6}
              width={12}
              height={12}
              rx={2}
              fill={colors.border}
              fillOpacity={0.9}
              className="cursor-nwse-resize"
              onMouseDown={handleResizeMouseDown('nw')}
            />
            <rect
              x={bounds.x + bounds.width - 6}
              y={bounds.y - 6}
              width={12}
              height={12}
              rx={2}
              fill={colors.border}
              fillOpacity={0.9}
              className="cursor-nesw-resize"
              onMouseDown={handleResizeMouseDown('ne')}
            />
            <rect
              x={bounds.x - 6}
              y={bounds.y + (isCollapsed ? headerHeight + 8 : bounds.height) - 6}
              width={12}
              height={12}
              rx={2}
              fill={colors.border}
              fillOpacity={0.9}
              className="cursor-nesw-resize"
              onMouseDown={handleResizeMouseDown('sw')}
            />
            <rect
              x={bounds.x + bounds.width - 6}
              y={bounds.y + (isCollapsed ? headerHeight + 8 : bounds.height) - 6}
              width={12}
              height={12}
              rx={2}
              fill={colors.border}
              fillOpacity={0.9}
              className="cursor-nwse-resize"
              onMouseDown={handleResizeMouseDown('se')}
            />
          </>
        )}
      </g>
    )
  }
)

TableGroupSVG.displayName = 'TableGroupSVG'
