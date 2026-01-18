/**
 * TypeScript Importer
 *
 * Parses TypeScript class/interface definitions and converts them to IR.
 * Uses regex-based parsing (no dependency on TypeScript compiler API).
 * Supports:
 *   - interface / type / class
 *   - JSDoc annotations: @pk, @unique, @notNull, @default, @ref
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

const INTERFACE_RE = /(?:export\s+)?interface\s+(\w+)\s*\{([^}]+)\}/gs
const TYPE_RE = /(?:export\s+)?type\s+(\w+)\s*=\s*\{([^}]+)\}/gs
const CLASS_RE =
  /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?\s*\{([^}]+)\}/gs

// Property: optional JSDoc + name + optional ? + : type
const PROPERTY_RE = /(\/\*\*[\s\S]*?\*\/\s*)?(readonly\s+)?(\w+)(\?)?\s*:\s*([^;\n]+)/g

// JSDoc tag matchers
const JSDOC_PK = /@pk\b/i
const JSDOC_UNIQUE = /@unique\b/i
const JSDOC_NOTNULL = /@notnull\b/i
const JSDOC_DEFAULT = /@default\s+(\S+)/i
const JSDOC_REF = /@ref\s+(\w+)\.(\w+)(?:\s+(one-to-one|one-to-many|many-to-one|many-to-many))?/i

// ─────────────────────────────────────────────────────────────
// Importer
// ─────────────────────────────────────────────────────────────

export function importTypeScript(source: string): DatabaseSchema {
  const schema: DatabaseSchema = {
    tables: [],
    relations: [],
    enums: [],
    tableGroups: [],
  }

  const blocks: Array<{ name: string; body: string }> = []

  // Gather interfaces
  for (const match of source.matchAll(INTERFACE_RE)) {
    blocks.push({ name: match[1], body: match[2] })
  }

  // Gather type aliases
  for (const match of source.matchAll(TYPE_RE)) {
    blocks.push({ name: match[1], body: match[2] })
  }

  // Gather classes
  for (const match of source.matchAll(CLASS_RE)) {
    blocks.push({ name: match[1], body: match[2] })
  }

  for (const { name, body } of blocks) {
    const table: Table = { name, columns: [], indexes: [] }

    for (const propMatch of body.matchAll(PROPERTY_RE)) {
      const jsdoc = propMatch[1] ?? ''
      const propName = propMatch[3]
      const optional = propMatch[4] === '?'
      const rawType = propMatch[5].trim()

      const settings: ColumnSettings = {}

      // Parse JSDoc annotations
      if (JSDOC_PK.test(jsdoc)) settings.primaryKey = true
      if (JSDOC_UNIQUE.test(jsdoc)) settings.unique = true
      if (JSDOC_NOTNULL.test(jsdoc) || !optional) settings.notNull = true

      const defaultMatch = jsdoc.match(JSDOC_DEFAULT)
      if (defaultMatch) {
        const val = defaultMatch[1]
        if (val === 'null') settings.default = null
        else if (val === 'true') settings.default = true
        else if (val === 'false') settings.default = false
        else if (!isNaN(Number(val))) settings.default = Number(val)
        else settings.default = val.replace(/^['"]|['"]$/g, '')
      }

      // Check for @ref
      const refMatch = jsdoc.match(JSDOC_REF)
      if (refMatch) {
        const relation: Relation = {
          from: { table: name, column: propName },
          to: { table: refMatch[1], column: refMatch[2] },
          type: (refMatch[3] as RelationType) ?? 'many-to-one',
        }
        schema.relations.push(relation)
      }

      const column: Column = {
        name: propName,
        type: mapTsType(rawType),
        rawType,
        settings,
      }

      table.columns.push(column)
    }

    schema.tables.push(table)
  }

  return schema
}

// ─────────────────────────────────────────────────────────────
// Type mapping
// ─────────────────────────────────────────────────────────────

function mapTsType(tsType: string): ColumnType {
  const t = tsType.toLowerCase().replace(/\s/g, '')

  if (t === 'number') return 'int'
  if (t === 'string') return 'varchar'
  if (t === 'boolean') return 'boolean'
  if (t === 'date') return 'datetime'
  if (t.startsWith('array') || t.endsWith('[]')) return 'json'
  if (t === 'object' || t.startsWith('record<')) return 'json'
  if (t === 'bigint') return 'bigint'

  return 'unknown'
}
