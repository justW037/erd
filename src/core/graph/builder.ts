/**
 * Graph Builder
 *
 * Converts IR DatabaseSchema to Graph model for rendering.
 */

import type { DatabaseSchema, Table, Column, Relation } from '../ir/types'
import type { Graph, TableNode, ColumnNode, Edge, EdgeType, Size, TableGroup } from './types'
import { NODE_DEFAULTS } from './types'

// ─────────────────────────────────────────────────────────────
// Build Graph from IR
// ─────────────────────────────────────────────────────────────

export function buildGraph(schema: DatabaseSchema): Graph {
  const nodes: TableNode[] = []
  const edges: Edge[] = []
  const groups: TableGroup[] = []

  // Track which columns are foreign keys
  const fkColumns = new Set<string>()
  for (const rel of schema.relations) {
    fkColumns.add(`${rel.from.table}.${rel.from.column}`)
  }

  // Build table nodes
  for (const table of schema.tables) {
    const node = buildTableNode(table, fkColumns)
    nodes.push(node)
  }

  // Build edges from relations
  for (const rel of schema.relations) {
    const edge = buildEdge(rel)
    edges.push(edge)
  }

  // Build groups (Task 44)
  if (schema.tableGroups) {
    for (const tg of schema.tableGroups) {
      groups.push({
        id: tg.name,
        name: tg.name,
        nodeIds: tg.tables,
        collapsed: false,
        selected: false,
      })

      // Update node.group reference for tables in this group
      for (const tableName of tg.tables) {
        const node = nodes.find((n) => n.name === tableName)
        if (node) {
          node.group = tg.name
        }
      }
    }
  }

  return { nodes, edges, groups, notes: [] }
}

// ─────────────────────────────────────────────────────────────
// Build Table Node
// ─────────────────────────────────────────────────────────────

function buildTableNode(table: Table, fkColumns: Set<string>): TableNode {
  const columns: ColumnNode[] = []
  let offsetY = NODE_DEFAULTS.headerHeight

  for (const col of table.columns) {
    const colNode = buildColumnNode(table.name, col, fkColumns, offsetY)
    columns.push(colNode)
    offsetY += NODE_DEFAULTS.columnHeight
  }

  const size = computeNodeSize(table, columns)

  return {
    id: table.name,
    name: table.name,
    schema: table.schema,
    position: { x: 0, y: 0 }, // Layout engine will set this
    size,
    columns,
    note: table.note,
    collapsed: false,
    selected: false,
  }
}

// ─────────────────────────────────────────────────────────────
// Build Column Node
// ─────────────────────────────────────────────────────────────

function buildColumnNode(
  tableName: string,
  col: Column,
  fkColumns: Set<string>,
  offsetY: number
): ColumnNode {
  const colKey = `${tableName}.${col.name}`

  return {
    id: colKey,
    name: col.name,
    type: col.rawType ?? col.type,
    isPrimaryKey: col.settings.primaryKey ?? false,
    isForeignKey: fkColumns.has(colKey),
    isUnique: col.settings.unique ?? false,
    isNullable: !(col.settings.notNull ?? false),
    offsetY,
  }
}

// ─────────────────────────────────────────────────────────────
// Compute Node Size
// ─────────────────────────────────────────────────────────────

function computeNodeSize(table: Table, columns: ColumnNode[]): Size {
  // Width based on longest text
  let maxTextLen = table.name.length

  for (const col of columns) {
    const textLen = col.name.length + col.type.length + 3 // " : " separator
    if (textLen > maxTextLen) maxTextLen = textLen
  }

  const width = Math.max(
    NODE_DEFAULTS.minWidth,
    maxTextLen * NODE_DEFAULTS.charWidth + NODE_DEFAULTS.padding * 2
  )

  const height =
    NODE_DEFAULTS.headerHeight + columns.length * NODE_DEFAULTS.columnHeight + NODE_DEFAULTS.padding

  return { width, height }
}

// ─────────────────────────────────────────────────────────────
// Build Edge
// ─────────────────────────────────────────────────────────────

function buildEdge(rel: Relation): Edge {
  const id = rel.name ?? `${rel.from.table}.${rel.from.column}->${rel.to.table}.${rel.to.column}`

  return {
    id,
    from: {
      nodeId: rel.from.table,
      columnId: `${rel.from.table}.${rel.from.column}`,
    },
    to: {
      nodeId: rel.to.table,
      columnId: `${rel.to.table}.${rel.to.column}`,
    },
    type: rel.type as EdgeType,
    selected: false,
  }
}

// ─────────────────────────────────────────────────────────────
// Utility: Find node by ID
// ─────────────────────────────────────────────────────────────

export function findNode(graph: Graph, nodeId: string): TableNode | undefined {
  return graph.nodes.find((n) => n.id === nodeId)
}

// ─────────────────────────────────────────────────────────────
// Utility: Find edge by ID
// ─────────────────────────────────────────────────────────────

export function findEdge(graph: Graph, edgeId: string): Edge | undefined {
  return graph.edges.find((e) => e.id === edgeId)
}

// ─────────────────────────────────────────────────────────────
// Utility: Compute group bounds
// ─────────────────────────────────────────────────────────────

export function computeGroupBounds(graph: Graph, groupPadding = 20): TableGroup[] {
  return (graph.groups || []).map((group) => {
    const groupNodes = graph.nodes.filter((n) => group.nodeIds.includes(n.id))
    if (groupNodes.length === 0) {
      return { ...group, bounds: undefined }
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const node of groupNodes) {
      minX = Math.min(minX, node.position.x)
      minY = Math.min(minY, node.position.y)
      maxX = Math.max(maxX, node.position.x + node.size.width)
      maxY = Math.max(maxY, node.position.y + node.size.height)
    }

    const headerHeight = 28
    return {
      ...group,
      bounds: {
        x: minX - groupPadding,
        y: minY - groupPadding - headerHeight,
        width: maxX - minX + groupPadding * 2,
        height: maxY - minY + groupPadding * 2 + headerHeight,
      },
    }
  })
}

// ─────────────────────────────────────────────────────────────
// Utility: Compute graph bounds
// ─────────────────────────────────────────────────────────────

export function computeGraphBounds(graph: Graph, padding = 40): Graph {
  // First update group bounds
  const updatedGroups = computeGroupBounds(graph)

  if (graph.nodes.length === 0) {
    return { ...graph, groups: updatedGroups, bounds: { x: 0, y: 0, width: 0, height: 0 } }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  // Include nodes in bounds
  for (const node of graph.nodes) {
    minX = Math.min(minX, node.position.x)
    minY = Math.min(minY, node.position.y)
    maxX = Math.max(maxX, node.position.x + node.size.width)
    maxY = Math.max(maxY, node.position.y + node.size.height)
  }

  // Also include group bounds if any
  for (const group of updatedGroups) {
    if (group.bounds) {
      minX = Math.min(minX, group.bounds.x)
      minY = Math.min(minY, group.bounds.y)
      maxX = Math.max(maxX, group.bounds.x + group.bounds.width)
      maxY = Math.max(maxY, group.bounds.y + group.bounds.height)
    }
  }

  return {
    ...graph,
    groups: updatedGroups,
    bounds: {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    },
  }
}
