/**
 * Viewport Culling Hook
 *
 * Provides virtualization for large schemas by only rendering
 * nodes and edges that are visible in the current viewport.
 */

import { useMemo } from 'react'
import type { TableNode, Edge } from '../core/graph/types'

interface Viewport {
  x: number
  y: number
  width: number
  height: number
  scale: number
}

interface CullingResult {
  visibleNodes: TableNode[]
  visibleEdges: Edge[]
  totalNodes: number
  totalEdges: number
}

/**
 * Calculate visible nodes and edges based on current viewport
 */
export function useViewportCulling(
  nodes: TableNode[],
  edges: Edge[],
  viewport: Viewport,
  padding = 100 // Extra padding around viewport
): CullingResult {
  return useMemo(() => {
    // Viewport bounds in world coordinates
    const viewLeft = viewport.x - padding
    const viewTop = viewport.y - padding
    const viewRight = viewport.x + viewport.width / viewport.scale + padding
    const viewBottom = viewport.y + viewport.height / viewport.scale + padding

    // Filter visible nodes
    const visibleNodes = nodes.filter((node) => {
      const nodeRight = node.position.x + node.size.width
      const nodeBottom = node.position.y + node.size.height

      // AABB intersection test
      return (
        node.position.x < viewRight &&
        nodeRight > viewLeft &&
        node.position.y < viewBottom &&
        nodeBottom > viewTop
      )
    })

    // Create set of visible node IDs for quick lookup
    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id))

    // Filter edges - visible if either endpoint is visible
    // or if edge crosses through the viewport
    const visibleEdges = edges.filter((edge) => {
      const fromVisible = visibleNodeIds.has(edge.from.nodeId)
      const toVisible = visibleNodeIds.has(edge.to.nodeId)

      // If either node is visible, show the edge
      if (fromVisible || toVisible) return true

      // Check if edge might cross viewport (both nodes outside but line crosses)
      const fromNode = nodes.find((n) => n.id === edge.from.nodeId)
      const toNode = nodes.find((n) => n.id === edge.to.nodeId)

      if (!fromNode || !toNode) return false

      // Simple check: if line between node centers crosses viewport
      return lineIntersectsRect(
        fromNode.position.x + fromNode.size.width / 2,
        fromNode.position.y + fromNode.size.height / 2,
        toNode.position.x + toNode.size.width / 2,
        toNode.position.y + toNode.size.height / 2,
        viewLeft,
        viewTop,
        viewRight,
        viewBottom
      )
    })

    return {
      visibleNodes,
      visibleEdges,
      totalNodes: nodes.length,
      totalEdges: edges.length,
    }
  }, [
    nodes,
    edges,
    viewport.x,
    viewport.y,
    viewport.width,
    viewport.height,
    viewport.scale,
    padding,
  ])
}

/**
 * Check if a line segment intersects with a rectangle
 * Using Cohen-Sutherland algorithm
 */
function lineIntersectsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  left: number,
  top: number,
  right: number,
  bottom: number
): boolean {
  // Region codes
  const INSIDE = 0
  const LEFT = 1
  const RIGHT = 2
  const BOTTOM = 4
  const TOP = 8

  function computeCode(x: number, y: number): number {
    let code = INSIDE
    if (x < left) code |= LEFT
    else if (x > right) code |= RIGHT
    if (y < top) code |= TOP
    else if (y > bottom) code |= BOTTOM
    return code
  }

  let code1 = computeCode(x1, y1)
  let code2 = computeCode(x2, y2)

  while (true) {
    if ((code1 | code2) === 0) {
      // Both inside
      return true
    }
    if ((code1 & code2) !== 0) {
      // Both outside same region
      return false
    }

    // Line might cross, compute intersection
    const codeOut = code1 !== 0 ? code1 : code2
    let x: number, y: number

    if (codeOut & TOP) {
      x = x1 + ((x2 - x1) * (top - y1)) / (y2 - y1)
      y = top
    } else if (codeOut & BOTTOM) {
      x = x1 + ((x2 - x1) * (bottom - y1)) / (y2 - y1)
      y = bottom
    } else if (codeOut & RIGHT) {
      y = y1 + ((y2 - y1) * (right - x1)) / (x2 - x1)
      x = right
    } else {
      y = y1 + ((y2 - y1) * (left - x1)) / (x2 - x1)
      x = left
    }

    if (codeOut === code1) {
      x1 = x
      y1 = y
      code1 = computeCode(x1, y1)
    } else {
      x2 = x
      y2 = y
      code2 = computeCode(x2, y2)
    }
  }
}

/**
 * Calculate statistics about current virtualization
 */
export function useVirtualizationStats(
  visibleNodes: number,
  totalNodes: number,
  visibleEdges: number,
  totalEdges: number
) {
  return useMemo(() => {
    const nodePercentage = totalNodes > 0 ? Math.round((visibleNodes / totalNodes) * 100) : 100
    const edgePercentage = totalEdges > 0 ? Math.round((visibleEdges / totalEdges) * 100) : 100

    return {
      nodePercentage,
      edgePercentage,
      isVirtualized: visibleNodes < totalNodes || visibleEdges < totalEdges,
      summary: `${visibleNodes}/${totalNodes} tables, ${visibleEdges}/${totalEdges} relations`,
    }
  }, [visibleNodes, totalNodes, visibleEdges, totalEdges])
}
