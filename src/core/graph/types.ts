/**
 * Graph Model Types
 *
 * Represents the visual graph structure for rendering ERD diagrams.
 * Tables become nodes, relations become edges.
 */

import type { DatabaseSchema } from '../ir/types'

// ─────────────────────────────────────────────────────────────
// Position & Dimensions
// ─────────────────────────────────────────────────────────────

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Bounds extends Point, Size {}

// ─────────────────────────────────────────────────────────────
// Column Node (nested inside table)
// ─────────────────────────────────────────────────────────────

export interface ColumnNode {
  id: string
  name: string
  type: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  isUnique: boolean
  isNullable: boolean
  /** Relative Y offset within the table node */
  offsetY: number
}

// ─────────────────────────────────────────────────────────────
// Table Node
// ─────────────────────────────────────────────────────────────

export interface TableNode {
  id: string
  name: string
  schema?: string
  position: Point
  size: Size
  columns: ColumnNode[]
  /** Group this table belongs to (optional) */
  group?: string
  /** Custom color / theme */
  color?: string
  /** Note / description */
  note?: string
  /** Is selected in editor */
  selected?: boolean
  /** Is collapsed (hide columns) */
  collapsed?: boolean
}

// ─────────────────────────────────────────────────────────────
// Edge (Relation)
// ─────────────────────────────────────────────────────────────

export type EdgeType = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'

export interface EdgeEndpoint {
  nodeId: string
  columnId: string
  /** Anchor point on the node boundary */
  anchor?: Point
}

export interface Edge {
  id: string
  from: EdgeEndpoint
  to: EdgeEndpoint
  type: EdgeType
  /** Optional label */
  label?: string
  /** Routing points for the edge path */
  points?: Point[]
  /** Per-edge curvature override (0 to 1+) */
  curvature?: number
  /** Is selected in editor */
  selected?: boolean
}

// ─────────────────────────────────────────────────────────────
// Table Group (Task 44)
// ─────────────────────────────────────────────────────────────

export interface TableGroup {
  id: string
  name: string
  color?: string
  collapsed?: boolean
  selected?: boolean
  /** IDs of tables in this group */
  nodeIds: string[]
  /** Visual bounds of the group box (computed) */
  bounds?: Bounds
}

// ─────────────────────────────────────────────────────────────
// Sticky Note (Task 45)
// ─────────────────────────────────────────────────────────────

export interface StickyNote {
  id: string
  text: string
  position: Point
  size: Size
  color?: string
  /** Z-order: higher values appear on top */
  zIndex?: number
  /** Optional attachment to a node */
  attachedToNode?: string
  /** Is selected in editor */
  selected?: boolean
  /** Is pinned (prevents accidental moves) */
  pinned?: boolean
}

// ─────────────────────────────────────────────────────────────
// Graph (complete diagram)
// ─────────────────────────────────────────────────────────────

export interface Graph {
  nodes: TableNode[]
  edges: Edge[]
  groups: TableGroup[]
  notes: StickyNote[]
  /** Computed bounding box of entire graph */
  bounds?: Bounds
  /** Graph-level metadata */
  metadata?: {
    name?: string
    note?: string
    createdAt?: string
    updatedAt?: string
  }
}

// ─────────────────────────────────────────────────────────────
// Layout Options
// ─────────────────────────────────────────────────────────────

export type LayoutDirection = 'TB' | 'BT' | 'LR' | 'RL'

export interface LayoutOptions {
  /** Layout direction: TB (top-bottom), LR (left-right), etc. */
  direction?: LayoutDirection
  /** Horizontal spacing between nodes */
  nodeSpacingX?: number
  /** Vertical spacing between nodes */
  nodeSpacingY?: number
  /** Padding inside the graph bounds */
  padding?: number
  /** Algorithm-specific options */
  algorithm?: string
}

// ─────────────────────────────────────────────────────────────
// Layout Engine Interface (abstraction)
// ─────────────────────────────────────────────────────────────

export interface LayoutEngine {
  name: string

  /**
   * Compute positions for all nodes and edge routing.
   * Returns a new Graph with updated positions.
   */
  layout(graph: Graph, options?: LayoutOptions): Graph
}

// ─────────────────────────────────────────────────────────────
// Node sizing constants
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Version History (Task 43)
// ─────────────────────────────────────────────────────────────

export interface Snapshot {
  id: string
  timestamp: number
  name: string
  summary: string
  dsl: string
  graph: Graph
  schema?: DatabaseSchema
}

export interface VersionHistory {
  snapshots: Snapshot[]
  currentId?: string
}

export const NODE_DEFAULTS = {
  /** Header height (table name) */
  headerHeight: 32,
  /** Height per column row */
  columnHeight: 24,
  /** Minimum node width */
  minWidth: 180,
  /** Padding inside node */
  padding: 8,
  /** Character width estimate for sizing */
  charWidth: 8,
}
