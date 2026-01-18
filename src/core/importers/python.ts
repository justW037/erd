/**
 * Python Importer
 *
 * Parses Python class definitions (dataclasses, TypedDict) and converts them to IR.
 * Uses regex-based parsing (no AST dependency).
 * Supports:
 *   - dataclass / TypedDict / NamedTuple
 *   - Type hints: str, int, float, bool, datetime, List, Dict, Optional
 *   - Comments with annotations: # @pk, # @unique, # @notNull, # @default, # @ref
 */

import type {
  DatabaseSchema,
  Table,
  Column,
  ColumnType,
  ColumnSettings,
  Relation,
  RelationType,
} from '../ir/types'

// ─────────────────────────────────────────────────────────────
// Regex patterns
// ─────────────────────────────────────────────────────────────

const DATACLASS_RE =
  /@dataclass[\s\S]*?class\s+(\w+).*?:\s*([\s\S]*?)(?=\n@dataclass|class\s+\w+|def\s+\w+|$)/g
const TYPEDDICT_RE = /class\s+(\w+)\(TypedDict\):\s*([\s\S]*?)(?=\nclass\s+|def\s+|$)/g
const NAMEDTUPLE_RE = /class\s+(\w+)\(NamedTuple\):\s*([\s\S]*?)(?=\nclass\s+|def\s+|$)/g

// Field: name: type [= default] [# comment]
const FIELD_RE = /^\s*(\w+)\s*:\s*([^#=\n]+)(?:\s*=\s*([^#\n]+))?(?:\s*#\s*(.*))?$/gm

// Annotation matchers in comments
const COMMENT_PK = /@pk\b/i
const COMMENT_UNIQUE = /@unique\b/i
const COMMENT_NOTNULL = /@notnull\b/i
const COMMENT_DEFAULT = /@default\s+(\S+)/i
const COMMENT_REF = /@ref\s+(\w+)\.(\w+)(?:\s+(one-to-one|one-to-many|many-to-one|many-to-many))?/i

// ─────────────────────────────────────────────────────────────
// Importer
// ─────────────────────────────────────────────────────────────

export function importPython(source: string): DatabaseSchema {
  const schema: DatabaseSchema = {
    tables: [],
    relations: [],
    enums: [],
    tableGroups: [],
  }

  const blocks: Array<{ name: string; body: string }> = []

  // Gather dataclasses
  for (const match of source.matchAll(DATACLASS_RE)) {
    blocks.push({ name: match[1], body: match[2] })
  }

  // Gather TypedDicts
  for (const match of source.matchAll(TYPEDDICT_RE)) {
    blocks.push({ name: match[1], body: match[2] })
  }

  // Gather NamedTuples
  for (const match of source.matchAll(NAMEDTUPLE_RE)) {
    blocks.push({ name: match[1], body: match[2] })
  }

  for (const { name, body } of blocks) {
    const table: Table = { name, columns: [], indexes: [] }

    for (const fieldMatch of body.matchAll(FIELD_RE)) {
      const fieldName = fieldMatch[1]
      const pyType = fieldMatch[2].trim()
      const defaultValue = fieldMatch[3]?.trim()
      const comment = fieldMatch[4] ?? ''

      const settings: ColumnSettings = {}

      // Check if Optional (nullable)
      const isOptional = pyType.includes('Optional') || pyType.includes('None')

      // Parse comment annotations
      if (COMMENT_PK.test(comment)) {
        settings.primaryKey = true
      }
      if (COMMENT_UNIQUE.test(comment)) {
        settings.unique = true
      }
      if (COMMENT_NOTNULL.test(comment) || !isOptional) {
        settings.notNull = true
      }

      // Default value
      const defaultMatch = comment.match(COMMENT_DEFAULT)
      if (defaultMatch) {
        const val = defaultMatch[1]
        if (val === 'None') settings.default = null
        else if (val === 'True') settings.default = true
        else if (val === 'False') settings.default = false
        else if (!isNaN(Number(val))) settings.default = Number(val)
        else settings.default = val.replace(/^['"]|['"]$/g, '')
      } else if (defaultValue && defaultValue !== 'field(...)') {
        // Use default value from field definition
        if (defaultValue === 'None') settings.default = null
        else if (defaultValue === 'True') settings.default = true
        else if (defaultValue === 'False') settings.default = false
        else if (!isNaN(Number(defaultValue))) settings.default = Number(defaultValue)
        else settings.default = defaultValue.replace(/^['"]|['"]$/g, '')
      }

      // Check for @ref
      const refMatch = comment.match(COMMENT_REF)
      if (refMatch) {
        const relation: Relation = {
          from: { table: name, column: fieldName },
          to: { table: refMatch[1], column: refMatch[2] },
          type: (refMatch[3] as RelationType) ?? 'many-to-one',
        }
        schema.relations.push(relation)
      }

      const column: Column = {
        name: fieldName,
        type: mapPythonType(pyType),
        rawType: pyType,
        settings,
      }

      table.columns.push(column)
    }

    if (table.columns.length > 0) {
      schema.tables.push(table)
    }
  }

  return schema
}

// ─────────────────────────────────────────────────────────────
// Type mapping
// ─────────────────────────────────────────────────────────────

function mapPythonType(pyType: string): ColumnType {
  const t = pyType
    .toLowerCase()
    .replace(/\s/g, '')
    .replace(/optional\[([^\]]+)\]/, '$1')

  if (t === 'int') return 'int'
  if (t === 'float') return 'decimal'
  if (t === 'bool') return 'boolean'
  if (t === 'str') return 'varchar'
  if (t === 'datetime' || t === 'datetime.datetime') return 'datetime'
  if (t === 'date' || t === 'datetime.date') return 'date'
  if (t === 'time' || t === 'datetime.time') return 'time'
  if (t === 'uuid' || t === 'uuid.uuid') return 'uuid'
  if (t.startsWith('list[') || t.startsWith('list<')) return 'json'
  if (t.startsWith('dict[') || t.startsWith('dict<')) return 'json'
  if (t === 'any' || t === 'object') return 'json'

  return 'unknown'
}
