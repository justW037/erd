/**
 * Intermediate Representation (IR) — Database Schema Model
 *
 * This is the canonical internal model that all parsers/importers
 * convert to. The renderer and exporter consume this IR.
 */

// ─────────────────────────────────────────────────────────────
// Column & Table
// ─────────────────────────────────────────────────────────────

export type ColumnType =
  | 'int'
  | 'bigint'
  | 'smallint'
  | 'float'
  | 'double'
  | 'decimal'
  | 'varchar'
  | 'char'
  | 'text'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'timestamp'
  | 'time'
  | 'uuid'
  | 'json'
  | 'blob'
  | 'enum'
  | 'unknown'

export interface ColumnSettings {
  primaryKey?: boolean
  unique?: boolean
  notNull?: boolean
  autoIncrement?: boolean
  default?: string | number | boolean | null
  note?: string
  /** For varchar(n) / char(n) */
  length?: number
  /** For decimal(p, s) */
  precision?: number
  scale?: number
  /** For enum type */
  enumValues?: string[]
}

export interface Column {
  name: string
  type: ColumnType
  rawType?: string // original type string if custom
  settings: ColumnSettings
}

export interface Index {
  name?: string
  columns: string[]
  unique?: boolean
  type?: 'btree' | 'hash' | 'gin' | 'gist'
}

export interface Table {
  name: string
  schema?: string
  alias?: string
  columns: Column[]
  indexes: Index[]
  note?: string
}

// ─────────────────────────────────────────────────────────────
// Relationships
// ─────────────────────────────────────────────────────────────

export type RelationType = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'

export interface Relation {
  name?: string
  from: {
    table: string
    column: string
  }
  to: {
    table: string
    column: string
  }
  type: RelationType
  note?: string
}

// ─────────────────────────────────────────────────────────────
// Enum
// ─────────────────────────────────────────────────────────────

export interface EnumValue {
  name: string
  note?: string
}

export interface DbEnum {
  name: string
  values: EnumValue[]
  note?: string
}

// ─────────────────────────────────────────────────────────────
// Table Group
// ─────────────────────────────────────────────────────────────

export interface TableGroup {
  name: string
  tables: string[]
}

// ─────────────────────────────────────────────────────────────
// Schema (top-level IR)
// ─────────────────────────────────────────────────────────────

export interface DatabaseSchema {
  name?: string
  tables: Table[]
  relations: Relation[]
  enums: DbEnum[]
  tableGroups: TableGroup[]
  note?: string
}

// ─────────────────────────────────────────────────────────────
// Validation result
// ─────────────────────────────────────────────────────────────

export interface ValidationError {
  type: 'error' | 'warning'
  message: string
  location?: {
    table?: string
    column?: string
    relation?: string
  }
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}
