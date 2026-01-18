/**
 * Dagre Layout Engine
 *
 * Uses dagre library for directed graph layout (hierarchical).
 * Ideal for ERD diagrams with foreign key relationships.
 */

import dagre from 'dagre'
import type { Graph, LayoutEngine, LayoutOptions, TableNode, Point } from './types'
import { computeGraphBounds } from './builder'

// ─────────────────────────────────────────────────────────────
// Default options
// ─────────────────────────────────────────────────────────────

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  direction: 'TB',
  nodeSpacingX: 60,
  nodeSpacingY: 40,
  padding: 40,
  algorithm: 'dagre',
}

// ─────────────────────────────────────────────────────────────
// Dagre Layout Engine Implementation
// ─────────────────────────────────────────────────────────────

export const dagreLayout: LayoutEngine = {
  name: 'dagre',

  layout(graph: Graph, options?: LayoutOptions): Graph {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    // Create dagre graph
    const g = new dagre.graphlib.Graph()
    g.setGraph({
      rankdir: opts.direction,
      nodesep: opts.nodeSpacingX,
      ranksep: opts.nodeSpacingY,
      marginx: opts.padding,
      marginy: opts.padding,
    })
    g.setDefaultEdgeLabel(() => ({}))

    // Add nodes
    for (const node of graph.nodes) {
      g.setNode(node.id, {
        width: node.size.width,
        height: node.size.height,
      })
    }

    // Add edges
    for (const edge of graph.edges) {
      g.setEdge(edge.from.nodeId, edge.to.nodeId)
    }

    // Run layout
    dagre.layout(g)

    // Extract positions
    const updatedNodes: TableNode[] = graph.nodes.map((node) => {
      const dagreNode = g.node(node.id)
      return {
        ...node,
        position: {
          // dagre returns center position, convert to top-left
          x: dagreNode.x - node.size.width / 2,
          y: dagreNode.y - node.size.height / 2,
        },
      }
    })

    // Extract edge points
    const updatedEdges = graph.edges.map((edge) => {
      const dagreEdge = g.edge(edge.from.nodeId, edge.to.nodeId)
      const points: Point[] = dagreEdge?.points ?? []
      return { ...edge, points }
    })

    const result: Graph = {
      ...graph,
      nodes: updatedNodes,
      edges: updatedEdges,
    }

    return computeGraphBounds(result, opts.padding)
  },
}

// ─────────────────────────────────────────────────────────────
// Simple Grid Layout (fallback / alternative)
// ─────────────────────────────────────────────────────────────

export const gridLayout: LayoutEngine = {
  name: 'grid',

  layout(graph: Graph, options?: LayoutOptions): Graph {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const columns = Math.ceil(Math.sqrt(graph.nodes.length))

    let x = opts.padding
    let y = opts.padding
    let rowHeight = 0
    let col = 0

    const updatedNodes: TableNode[] = graph.nodes.map((node) => {
      const newNode = {
        ...node,
        position: { x, y },
      }

      rowHeight = Math.max(rowHeight, node.size.height)
      col++

      if (col >= columns) {
        col = 0
        x = opts.padding
        y += rowHeight + opts.nodeSpacingY
        rowHeight = 0
      } else {
        x += node.size.width + opts.nodeSpacingX
      }

      return newNode
    })

    const result: Graph = {
      ...graph,
      nodes: updatedNodes,
    }

    return computeGraphBounds(result, opts.padding)
  },
}

// ─────────────────────────────────────────────────────────────
// Layout Engine Registry
// ─────────────────────────────────────────────────────────────

const layoutEngines: Map<string, LayoutEngine> = new Map([
  ['dagre', dagreLayout],
  ['grid', gridLayout],
])

export function getLayoutEngine(name: string): LayoutEngine {
  return layoutEngines.get(name) ?? dagreLayout
}

export function registerLayoutEngine(engine: LayoutEngine): void {
  layoutEngines.set(engine.name, engine)
}

// ─────────────────────────────────────────────────────────────
// Convenience function
// ─────────────────────────────────────────────────────────────

export function layoutGraph(
  graph: Graph,
  engineName: string = 'dagre',
  options?: LayoutOptions
): Graph {
  const engine = getLayoutEngine(engineName)
  return engine.layout(graph, options)
}
