/**
 * Unit tests for Layout Engines
 */

import { describe, it, expect } from 'vitest'
import { getLayoutEngine, dagreLayout, gridLayout } from './layout'
import type { Graph, TableNode } from './types'

function createTestGraph(nodeCount: number): Graph {
  const nodes: TableNode[] = []
  const edges = []

  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `table${i}`,
      name: `table${i}`,
      position: { x: 0, y: 0 },
      size: { width: 180, height: 80 },
      columns: [
        {
          id: `table${i}.id`,
          name: 'id',
          type: 'int',
          isPrimaryKey: true,
          isForeignKey: false,
          isUnique: false,
          isNullable: false,
          offsetY: 32,
        },
      ],
    })
  }

  // Create some relations
  for (let i = 1; i < nodeCount; i++) {
    edges.push({
      id: `edge${i}`,
      from: { nodeId: `table${i}`, columnId: `table${i}.id` },
      to: { nodeId: 'table0', columnId: 'table0.id' },
      type: 'many-to-one' as const,
    })
  }

  return { nodes, edges }
}

describe('Layout Engines', () => {
  describe('getLayoutEngine', () => {
    it('should return dagre engine', () => {
      const engine = getLayoutEngine('dagre')
      expect(engine.name).toBe('dagre')
    })

    it('should return grid engine', () => {
      const engine = getLayoutEngine('grid')
      expect(engine.name).toBe('grid')
    })

    it('should return dagre for unknown engine', () => {
      const engine = getLayoutEngine('unknown')
      expect(engine.name).toBe('dagre')
    })
  })

  describe('dagreLayout', () => {
    it('should handle empty graph', () => {
      const graph: Graph = { nodes: [], edges: [] }
      const result = dagreLayout.layout(graph)
      expect(result.nodes).toHaveLength(0)
      expect(result.edges).toHaveLength(0)
    })

    it('should layout single node', () => {
      const graph = createTestGraph(1)
      const result = dagreLayout.layout(graph)

      expect(result.nodes).toHaveLength(1)
      // Position should be set
      expect(typeof result.nodes[0].position.x).toBe('number')
      expect(typeof result.nodes[0].position.y).toBe('number')
    })

    it('should layout multiple nodes', () => {
      const graph = createTestGraph(5)
      const result = dagreLayout.layout(graph)

      expect(result.nodes).toHaveLength(5)

      // All nodes should have positions
      result.nodes.forEach((node) => {
        expect(typeof node.position.x).toBe('number')
        expect(typeof node.position.y).toBe('number')
      })
    })

    it('should not have overlapping nodes', () => {
      const graph = createTestGraph(10)
      const result = dagreLayout.layout(graph)

      // Check no two nodes overlap
      for (let i = 0; i < result.nodes.length; i++) {
        for (let j = i + 1; j < result.nodes.length; j++) {
          const a = result.nodes[i]
          const b = result.nodes[j]

          const aRight = a.position.x + a.size.width
          const aBottom = a.position.y + a.size.height
          const bRight = b.position.x + b.size.width
          const bBottom = b.position.y + b.size.height

          // Simple overlap check
          const overlapsX = a.position.x < bRight && aRight > b.position.x
          const overlapsY = a.position.y < bBottom && aBottom > b.position.y
          const overlaps = overlapsX && overlapsY

          expect(overlaps).toBe(false)
        }
      }
    })
  })

  describe('gridLayout', () => {
    it('should handle empty graph', () => {
      const graph: Graph = { nodes: [], edges: [] }
      const result = gridLayout.layout(graph)
      expect(result.nodes).toHaveLength(0)
    })

    it('should layout single node', () => {
      const graph = createTestGraph(1)
      const result = gridLayout.layout(graph)

      expect(result.nodes).toHaveLength(1)
      expect(typeof result.nodes[0].position.x).toBe('number')
      expect(typeof result.nodes[0].position.y).toBe('number')
    })

    it('should layout nodes in grid pattern', () => {
      const graph = createTestGraph(9)
      const result = gridLayout.layout(graph)

      expect(result.nodes).toHaveLength(9)

      // All nodes should have valid positions
      result.nodes.forEach((node) => {
        expect(node.position.x).toBeGreaterThanOrEqual(0)
        expect(node.position.y).toBeGreaterThanOrEqual(0)
      })
    })

    it('should not have overlapping nodes', () => {
      const graph = createTestGraph(16)
      const result = gridLayout.layout(graph)

      // Check no overlaps
      for (let i = 0; i < result.nodes.length; i++) {
        for (let j = i + 1; j < result.nodes.length; j++) {
          const a = result.nodes[i]
          const b = result.nodes[j]

          const overlapsX =
            a.position.x < b.position.x + b.size.width && a.position.x + a.size.width > b.position.x
          const overlapsY =
            a.position.y < b.position.y + b.size.height &&
            a.position.y + a.size.height > b.position.y
          const overlaps = overlapsX && overlapsY

          expect(overlaps).toBe(false)
        }
      }
    })
  })
})
