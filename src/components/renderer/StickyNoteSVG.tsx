/**
 * StickyNoteSVG Component (Task 45)
 *
 * Renders a sticky note on the canvas with:
 * - Text content
 * - Customizable color
 * - Drag-to-move support
 * - Resize handles
 * - Pin/unpin toggle
 * - Z-order control
 */

import React, { memo, useCallback, useState } from 'react'
import type { StickyNote } from '../../core/graph/types'

interface StickyNoteSVGProps {
  note: StickyNote
  selected?: boolean
  onSelect?: (id: string) => void
  onDragStart?: (id: string, startX: number, startY: number) => void
  onResizeStart?: (
    id: string,
    corner: 'nw' | 'ne' | 'sw' | 'se',
    startX: number,
    startY: number
  ) => void
  onUpdate?: (id: string, updates: Partial<StickyNote>) => void
  onDelete?: (id: string) => void
}

// Sticky note color palette
const NOTE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  yellow: { bg: '#fef3c7', border: '#fcd34d', text: '#78350f' },
  pink: { bg: '#fbcfe8', border: '#f472b6', text: '#831843' },
  blue: { bg: '#bfdbfe', border: '#60a5fa', text: '#1e3a8a' },
  green: { bg: '#bbf7d0', border: '#6ee7b7', text: '#065f46' },
  purple: { bg: '#e9d5ff', border: '#d8b4fe', text: '#4c1d95' },
  orange: { bg: '#fed7aa', border: '#fb923c', text: '#7c2d12' },
}

const getNoteColors = (color?: string) => {
  return NOTE_COLORS[color || 'yellow'] || NOTE_COLORS.yellow
}

export const StickyNoteSVG: React.FC<StickyNoteSVGProps> = memo(
  ({ note, selected = false, onSelect, onDragStart, onResizeStart, onUpdate, onDelete }) => {
    const { position, size, text, pinned = false } = note
    const colors = getNoteColors(note.color)
    const [isEditing, setIsEditing] = useState(false)
    const [editText, setEditText] = useState(text)

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (e.button === 0 && !pinned) {
          e.stopPropagation()
          onSelect?.(note.id)
          onDragStart?.(note.id, e.clientX, e.clientY)
        }
      },
      [note.id, pinned, onSelect, onDragStart]
    )

    const handleResizeMouseDown = useCallback(
      (corner: 'nw' | 'ne' | 'sw' | 'se') => (e: React.MouseEvent) => {
        e.stopPropagation()
        if (e.button !== 0 || pinned) return
        onSelect?.(note.id)
        onResizeStart?.(note.id, corner, e.clientX, e.clientY)
      },
      [note.id, pinned, onSelect, onResizeStart]
    )

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation()
      setIsEditing(true)
    }, [])

    const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setEditText(e.target.value)
    }, [])

    const handleTextBlur = useCallback(() => {
      setIsEditing(false)
      if (editText !== text) {
        onUpdate?.(note.id, { text: editText })
      }
    }, [note.id, editText, text, onUpdate])

    const handlePinToggle = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onUpdate?.(note.id, { pinned: !pinned })
      },
      [note.id, pinned, onUpdate]
    )

    const handleDelete = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onDelete?.(note.id)
      },
      [note.id, onDelete]
    )

    const handleZIndexUp = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onUpdate?.(note.id, { zIndex: (note.zIndex ?? 0) + 1 })
      },
      [note.id, note.zIndex, onUpdate]
    )

    const handleZIndexDown = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onUpdate?.(note.id, { zIndex: Math.max(0, (note.zIndex ?? 0) - 1) })
      },
      [note.id, note.zIndex, onUpdate]
    )

    const minW = 80
    const minH = 60
    const handleSize = 8

    return (
      <g
        className="sticky-note"
        style={{
          zIndex: note.zIndex ?? 0,
          opacity: pinned ? 0.8 : 1,
        }}
      >
        {/* Main note background */}
        <rect
          x={position.x}
          y={position.y}
          width={size.width}
          height={size.height}
          fill={colors.bg}
          stroke={selected ? '#3b82f6' : colors.border}
          strokeWidth={selected ? 2 : 1}
          rx={4}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          style={{ cursor: pinned ? 'default' : 'move' }}
        />

        {/* Header bar with controls */}
        <rect
          x={position.x}
          y={position.y}
          width={size.width}
          height={24}
          fill={colors.border}
          rx={4}
          style={{ cursor: 'default' }}
        />

        {/* Pin button */}
        <g onClick={handlePinToggle} style={{ cursor: 'pointer' }}>
          <circle
            cx={position.x + size.width - 12}
            cy={position.y + 12}
            r={5}
            fill={pinned ? '#ef4444' : '#9ca3af'}
            opacity={0.7}
          />
          <text
            x={position.x + size.width - 12}
            y={position.y + 15}
            textAnchor="middle"
            fontSize="8"
            fill="white"
            fontWeight="bold"
            pointerEvents="none"
          >
            {pinned ? '📌' : '○'}
          </text>
        </g>

        {/* Delete button */}
        <g onClick={handleDelete} style={{ cursor: 'pointer' }}>
          <circle
            cx={position.x + size.width - 28}
            cy={position.y + 12}
            r={5}
            fill="#9ca3af"
            opacity={0.7}
          />
          <text
            x={position.x + size.width - 28}
            y={position.y + 15}
            textAnchor="middle"
            fontSize="10"
            fill="white"
            fontWeight="bold"
            pointerEvents="none"
          >
            ✕
          </text>
        </g>

        {/* Z-order controls */}
        <g onClick={handleZIndexUp} style={{ cursor: 'pointer' }}>
          <circle cx={position.x + 12} cy={position.y + 12} r={4} fill="#9ca3af" opacity={0.5} />
          <text
            x={position.x + 12}
            y={position.y + 14}
            textAnchor="middle"
            fontSize="8"
            fill="white"
            fontWeight="bold"
            pointerEvents="none"
          >
            ↑
          </text>
        </g>

        <g onClick={handleZIndexDown} style={{ cursor: 'pointer' }}>
          <circle cx={position.x + 24} cy={position.y + 12} r={4} fill="#9ca3af" opacity={0.5} />
          <text
            x={position.x + 24}
            y={position.y + 14}
            textAnchor="middle"
            fontSize="8"
            fill="white"
            fontWeight="bold"
            pointerEvents="none"
          >
            ↓
          </text>
        </g>

        {/* Text content */}
        <foreignObject
          x={position.x + 4}
          y={position.y + 28}
          width={size.width - 8}
          height={size.height - 32}
          style={{ overflow: 'hidden' }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              padding: '4px',
              fontSize: '12px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              color: colors.text,
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              overflow: 'auto',
              backgroundColor: 'transparent',
            }}
          >
            {text}
          </div>
        </foreignObject>

        {/* Resize handles (only show if selected and not pinned) */}
        {selected && !pinned && (
          <>
            {/* NW corner */}
            <rect
              x={position.x - handleSize / 2}
              y={position.y - handleSize / 2}
              width={handleSize}
              height={handleSize}
              fill="#3b82f6"
              onMouseDown={handleResizeMouseDown('nw')}
              style={{ cursor: 'nwse-resize' }}
            />
            {/* NE corner */}
            <rect
              x={position.x + size.width - handleSize / 2}
              y={position.y - handleSize / 2}
              width={handleSize}
              height={handleSize}
              fill="#3b82f6"
              onMouseDown={handleResizeMouseDown('ne')}
              style={{ cursor: 'nesw-resize' }}
            />
            {/* SW corner */}
            <rect
              x={position.x - handleSize / 2}
              y={position.y + size.height - handleSize / 2}
              width={handleSize}
              height={handleSize}
              fill="#3b82f6"
              onMouseDown={handleResizeMouseDown('sw')}
              style={{ cursor: 'nesw-resize' }}
            />
            {/* SE corner */}
            <rect
              x={position.x + size.width - handleSize / 2}
              y={position.y + size.height - handleSize / 2}
              width={handleSize}
              height={handleSize}
              fill="#3b82f6"
              onMouseDown={handleResizeMouseDown('se')}
              style={{ cursor: 'nwse-resize' }}
            />
          </>
        )}
      </g>
    )
  }
)

StickyNoteSVG.displayName = 'StickyNoteSVG'
