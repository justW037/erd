/**
 * C# Importer
 *
 * Parses C# class/interface definitions and converts them to IR.
 * Uses regex-based parsing (no dependency on Roslyn compiler).
 * Supports:
 *   - class / interface / record
 *   - XML doc comments: <pk />, <unique />, <notNull />, <default>, <ref>
 *   - Entity Framework annotations: [Key], [Required], [ForeignKey]
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
  /(?:public\s+)?(?:partial\s+)?class\s+(\w+)(?:\s*:\s*[\w,\s]+)?\s*\{([\s\S]*?)\s*\}/g
const INTERFACE_RE = /(?:public\s+)?interface\s+(\w+)(?:\s*:\s*[\w,\s]+)?\s*\{([\s\S]*?)\s*\}/g
const RECORD_RE = /(?:public\s+)?record\s+(\w+)\s*\(([^)]+)\)/g

// Property: optional xml doc/attributes + modifiers + type + name + { get; set; }
const PROPERTY_RE =
  /((?:\/\/\/[^\n]*\n)*(?:\[[^\]]+\]\s*\n)*)\s*(?:public|private|protected)?\s*(?:virtual\s+)?(?:required\s+)?(\w+(?:<[^>]+>)?(?:\[\])?(?:\?)?)\s+(\w+)\s*\{\s*get;\s*(?:set;|init;)?\s*\}/g

// XML doc tag matchers
const XML_PK = /<pk\s*\/>/i
const XML_UNIQUE = /<unique\s*\/>/i
const XML_NOTNULL = /<notNull\s*\/>/i
const XML_DEFAULT = /<default>([^<]+)<\/default>/i
const XML_REF =
  /<ref\s+table="(\w+)"\s+column="(\w+)"(?:\s+type="(one-to-one|one-to-many|many-to-one|many-to-many)")?\s*\/>/i

// EF annotations
const EF_KEY = /\[Key\]/
const EF_REQUIRED = /\[Required\]/
const EF_FOREIGN_KEY = /\[ForeignKey\(["'](\w+)["']\)\]/

// ─────────────────────────────────────────────────────────────
// Importer
// ─────────────────────────────────────────────────────────────

export function importCSharp(source: string): DatabaseSchema {
  const schema: DatabaseSchema = {
    tables: [],
    relations: [],
    enums: [],
    tableGroups: [],
  }

  const blocks: Array<{ name: string; body: string }> = []

  // Helper: extract a balanced-brace block starting at the first '{' after pos
  function extractBlockBody(src: string, startPos: number): { body: string; end: number } | null {
    const openIdx = src.indexOf('{', startPos)
    if (openIdx === -1) return null
    let depth = 0
    let i = openIdx
    for (; i < src.length; i++) {
      const ch = src[i]
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          return { body: src.slice(openIdx + 1, i), end: i }
        }
      }
    }
    return null
  }

  // Gather classes using brace-matching (more robust)
  const classMatcher = /(?:public\s+)?(?:partial\s+)?class\s+(\w+)/g
  let m
  while ((m = classMatcher.exec(source)) !== null) {
    const name = m[1]
    const bodyRes = extractBlockBody(source, m.index)
    if (bodyRes) blocks.push({ name, body: bodyRes.body })
  }

  // Gather interfaces similarly
  const ifaceMatcher = /(?:public\s+)?interface\s+(\w+)/g
  while ((m = ifaceMatcher.exec(source)) !== null) {
    const name = m[1]
    const bodyRes = extractBlockBody(source, m.index)
    if (bodyRes) blocks.push({ name, body: bodyRes.body })
  }

  // Gather records (C# 9+)
  for (const match of source.matchAll(RECORD_RE)) {
    const recordName = match[1]
    const params = match[2]
    // Convert record params to property-like syntax
    const propsBody = params
      .split(',')
      .map((p) => {
        const parts = p.trim().split(/\s+/)
        if (parts.length >= 2) {
          return `public ${parts[0]} ${parts[1]} { get; init; }`
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
    blocks.push({ name: recordName, body: propsBody })
  }

  for (const { name, body } of blocks) {
    const table: Table = { name, columns: [], indexes: [] }

    for (const propMatch of body.matchAll(PROPERTY_RE)) {
      const annotations = propMatch[1] ?? ''
      const csType = propMatch[2].trim()
      const propName = propMatch[3]

      const settings: ColumnSettings = {}

      // Check if nullable (has ? suffix)
      const nullable = csType.endsWith('?')
      const cleanType = csType.replace(/\?$/, '').trim()

      // Parse XML doc/EF annotations
      if (XML_PK.test(annotations) || EF_KEY.test(annotations)) {
        settings.primaryKey = true
      }
      if (XML_UNIQUE.test(annotations)) {
        settings.unique = true
      }
      if (XML_NOTNULL.test(annotations) || EF_REQUIRED.test(annotations) || !nullable) {
        settings.notNull = true
      }

      const defaultMatch = annotations.match(XML_DEFAULT)
      if (defaultMatch) {
        const val = defaultMatch[1].trim()
        if (val === 'null') settings.default = null
        else if (val === 'true') settings.default = true
        else if (val === 'false') settings.default = false
        else if (!isNaN(Number(val))) settings.default = Number(val)
        else settings.default = val.replace(/^['"]|['"]$/g, '')
      }

      // Check for <ref>
      const refMatch = annotations.match(XML_REF)
      if (refMatch) {
        const relation: Relation = {
          from: { table: name, column: propName },
          to: { table: refMatch[1], column: refMatch[2] },
          type: (refMatch[3] as RelationType) ?? 'many-to-one',
        }
        schema.relations.push(relation)
      }

      // Check for [ForeignKey]
      const fkMatch = annotations.match(EF_FOREIGN_KEY)
      if (fkMatch) {
        // ForeignKey references another entity - use the attribute value if present
        const refTable = fkMatch[1] || cleanType.replace(/^I/, '')
        const relation: Relation = {
          from: { table: name, column: propName },
          to: { table: refTable, column: 'Id' }, // Assume Id convention
          type: 'many-to-one',
        }
        schema.relations.push(relation)
      }

      const column: Column = {
        name: propName,
        type: mapCSharpType(cleanType),
        rawType: csType,
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

function mapCSharpType(csType: string): ColumnType {
  const t = csType.toLowerCase().replace(/\s/g, '')

  if (t === 'int' || t === 'int32') return 'int'
  if (t === 'long' || t === 'int64') return 'bigint'
  if (t === 'short' || t === 'int16' || t === 'byte') return 'int'
  if (t === 'float' || t === 'double' || t === 'decimal') return 'decimal'
  if (t === 'bool' || t === 'boolean') return 'boolean'
  if (t === 'string') return 'varchar'
  if (t === 'datetime' || t === 'datetimeoffset') return 'datetime'
  if (t === 'dateonly') return 'date'
  if (t === 'timeonly' || t === 'timespan') return 'time'
  if (t === 'guid') return 'uuid'
  if (t.startsWith('list<') || t.startsWith('icollection<') || t.startsWith('ienumerable<'))
    return 'json'
  if (t.startsWith('dictionary<') || t.endsWith('[]')) return 'json'

  return 'unknown'
}
