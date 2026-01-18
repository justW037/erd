/**
 * Java Importer
 *
 * Parses Java class definitions and converts them to IR.
 * Uses regex-based parsing (no dependency on Java compiler).
 * Supports:
 *   - class / interface / record
 *   - JavaDoc annotations: @pk, @unique, @notNull, @default, @ref
 *   - JPA annotations: @Id, @Column, @ManyToOne, @OneToMany, @OneToOne, @ManyToMany
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

const CLASS_RE =
  /(?:public\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?\s*\{([^}]+)\}/gs
const INTERFACE_RE = /(?:public\s+)?interface\s+(\w+)(?:\s+extends\s+[\w,\s]+)?\s*\{([^}]+)\}/gs
const RECORD_RE = /(?:public\s+)?record\s+(\w+)\s*\(([^)]+)\)/gs

// Field: optional javadoc/annotations + modifiers + type + name + optional initializer
const FIELD_RE =
  /(\/\*\*[\s\S]*?\*\/\s*|(?:@\w+(?:\([^)]*\))?[\s\n]*)*)?(?:private|public|protected)?\s*(?:static\s+)?(?:final\s+)?(\w+(?:<[^>]+>)?(?:\[\])?)\s+(\w+)(?:\s*=\s*[^;]+)?;/g

// Annotation matchers
const JSDOC_PK = /@pk\b/i
const JSDOC_UNIQUE = /@unique\b/i
const JSDOC_NOTNULL = /@notnull\b/i
const JSDOC_DEFAULT = /@default\s+(\S+)/i
const JSDOC_REF = /@ref\s+(\w+)\.(\w+)(?:\s+(one-to-one|one-to-many|many-to-one|many-to-many))?/i

// JPA annotations
const JPA_ID = /@Id\b/
const JPA_COLUMN = /@Column\b/
const JPA_MANY_TO_ONE = /@ManyToOne\b/
const JPA_ONE_TO_MANY = /@OneToMany\b/
const JPA_ONE_TO_ONE = /@OneToOne\b/
const JPA_MANY_TO_MANY = /@ManyToMany\b/

// ─────────────────────────────────────────────────────────────
// Importer
// ─────────────────────────────────────────────────────────────

export function importJava(source: string): DatabaseSchema {
  const schema: DatabaseSchema = {
    tables: [],
    relations: [],
    enums: [],
    tableGroups: [],
  }

  const blocks: Array<{ name: string; body: string }> = []

  // Gather classes
  for (const match of source.matchAll(CLASS_RE)) {
    blocks.push({ name: match[1], body: match[2] })
  }

  // Gather interfaces
  for (const match of source.matchAll(INTERFACE_RE)) {
    blocks.push({ name: match[1], body: match[2] })
  }

  // Gather records (Java 14+)
  for (const match of source.matchAll(RECORD_RE)) {
    const recordName = match[1]
    const params = match[2]
    // Convert record params to field-like syntax
    const fieldsBody = params
      .split(',')
      .map((p) => {
        const parts = p.trim().split(/\s+/)
        if (parts.length >= 2) {
          return `${parts[0]} ${parts[1]};`
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
    blocks.push({ name: recordName, body: fieldsBody })
  }

  for (const { name, body } of blocks) {
    const table: Table = { name, columns: [], indexes: [] }

    for (const fieldMatch of body.matchAll(FIELD_RE)) {
      const annotations = fieldMatch[1] ?? ''
      const javaType = fieldMatch[2].trim()
      const fieldName = fieldMatch[3]

      const settings: ColumnSettings = {}

      // Parse JavaDoc/JPA annotations
      if (JSDOC_PK.test(annotations) || JPA_ID.test(annotations)) {
        settings.primaryKey = true
      }
      if (JSDOC_UNIQUE.test(annotations)) {
        settings.unique = true
      }
      if (JSDOC_NOTNULL.test(annotations)) {
        settings.notNull = true
      }

      const defaultMatch = annotations.match(JSDOC_DEFAULT)
      if (defaultMatch) {
        const val = defaultMatch[1]
        if (val === 'null') settings.default = null
        else if (val === 'true') settings.default = true
        else if (val === 'false') settings.default = false
        else if (!isNaN(Number(val))) settings.default = Number(val)
        else settings.default = val.replace(/^['"]|['"]$/g, '')
      }

      // Check for @ref
      const refMatch = annotations.match(JSDOC_REF)
      let relationType: RelationType = 'many-to-one'

      // Determine relation type from JPA annotations
      if (JPA_ONE_TO_ONE.test(annotations)) relationType = 'one-to-one'
      else if (JPA_ONE_TO_MANY.test(annotations)) relationType = 'one-to-many'
      else if (JPA_MANY_TO_ONE.test(annotations)) relationType = 'many-to-one'
      else if (JPA_MANY_TO_MANY.test(annotations)) relationType = 'many-to-many'

      if (refMatch) {
        const relation: Relation = {
          from: { table: name, column: fieldName },
          to: { table: refMatch[1], column: refMatch[2] },
          type: (refMatch[3] as RelationType) ?? relationType,
        }
        schema.relations.push(relation)
      }

      const column: Column = {
        name: fieldName,
        type: mapJavaType(javaType),
        rawType: javaType,
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

function mapJavaType(javaType: string): ColumnType {
  const t = javaType.toLowerCase().replace(/\s/g, '')

  if (t === 'int' || t === 'integer') return 'int'
  if (t === 'long') return 'bigint'
  if (t === 'short' || t === 'byte') return 'int'
  if (t === 'float' || t === 'double') return 'decimal'
  if (t === 'boolean') return 'boolean'
  if (t === 'string') return 'varchar'
  if (t === 'date' || t === 'localdate') return 'date'
  if (t === 'localdatetime' || t === 'timestamp' || t === 'instant') return 'datetime'
  if (t === 'localtime') return 'time'
  if (t.startsWith('list<') || t.startsWith('set<') || t.startsWith('collection<')) return 'json'
  if (t.startsWith('map<')) return 'json'
  if (t.endsWith('[]')) return 'json'

  return 'unknown'
}
