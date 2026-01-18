import React, { memo } from 'react'
import type { Graph } from '../../core/graph/types'

interface MiniMapProps {
  graph: Graph
  view: { panX: number; panY: number; zoom: number; width: number; height: number }
  width?: number
  height?: number
  onNavigate?: (x: number, y: number, zoom?: number) => void
}

export const MiniMap: React.FC<MiniMapProps> = memo(
  ({ graph, view, width = 200, height = 140, onNavigate }) => {
    if (!graph.bounds)
      return (
        <div className="absolute bottom-4 left-4 p-2 bg-white/80 dark:bg-slate-800/80 rounded shadow" />
      )

    const scaleX = width / graph.bounds.width
    const scaleY = height / graph.bounds.height
    const scale = Math.min(scaleX, scaleY)

    const offsetX = -graph.bounds.x * scale + (width - graph.bounds.width * scale) / 2
    const offsetY = -graph.bounds.y * scale + (height - graph.bounds.height * scale) / 2

    // viewport rect in minimap coords
    const viewLeft = -view.panX * scale + offsetX
    const viewTop = -view.panY * scale + offsetY
    const viewW = (view.width / view.zoom) * scale
    const viewH = (view.height / view.zoom) * scale

    const handleClick = (e: React.MouseEvent) => {
      const rect = (e.target as SVGElement).closest('svg')!.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      // Transform back to graph coords
      const gx = (x - offsetX) / scale
      const gy = (y - offsetY) / scale
      // Center viewport there
      const targetPanX = -(gx - view.width / (2 * view.zoom))
      const targetPanY = -(gy - view.height / (2 * view.zoom))
      onNavigate?.(targetPanX, targetPanY)
    }

    return (
      <div
        className="absolute bottom-4 left-4 p-1 bg-white/80 dark:bg-slate-800/80 rounded shadow-lg"
        style={{ width }}
      >
        <svg width={width} height={height} onClick={handleClick} style={{ display: 'block' }}>
          <rect x={0} y={0} width={width} height={height} fill="transparent" stroke="none" />
          <g transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}>
            {graph.nodes.map((n) => (
              <rect
                key={n.id}
                x={n.position.x}
                y={n.position.y}
                width={Math.max(2, n.size.width)}
                height={Math.max(2, n.size.height)}
                fill="rgba(59,130,246,0.15)"
                stroke="rgba(2,6,23,0.08)"
                strokeWidth={1 / scale}
              />
            ))}
          </g>
          <rect
            x={viewLeft}
            y={viewTop}
            width={Math.max(2, viewW)}
            height={Math.max(2, viewH)}
            fill="none"
            stroke="#2563eb"
            strokeWidth={1}
          />
        </svg>
      </div>
    )
  }
)

export default MiniMap
