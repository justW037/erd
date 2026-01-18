/**
 * Schema Validator
 *
 * Validates an IR DatabaseSchema for common issues:
 *  - Duplicate table/column names
 *  - FK references to non-existent tables/columns
 *  - Missing primary keys (warning)
 *  - Invalid enum references
 */

import type { DatabaseSchema, ValidationResult, ValidationError } from './types'

export function validateSchema(schema: DatabaseSchema): ValidationResult {
  const errors: ValidationError[] = []

  const tableNames = new Set<string>()
  const tableColumnMap = new Map<string, Set<string>>()
  const enumNames = new Set(schema.enums.map((e) => e.name))

  // ─────────────────────────────────────────────────────────────
  // 1. Check tables
  // ─────────────────────────────────────────────────────────────

  for (const table of schema.tables) {
    // Duplicate table name
    if (tableNames.has(table.name)) {
      errors.push({
        type: 'error',
        message: `Duplicate table name: "${table.name}"`,
        location: { table: table.name },
      })
    }
    tableNames.add(table.name)

    const colNames = new Set<string>()
    let hasPrimaryKey = false

    for (const col of table.columns) {
      // Duplicate column name
      if (colNames.has(col.name)) {
        errors.push({
          type: 'error',
          message: `Duplicate column "${col.name}" in table "${table.name}"`,
          location: { table: table.name, column: col.name },
        })
      }
      colNames.add(col.name)

      if (col.settings.primaryKey) hasPrimaryKey = true

      // Enum type should reference a declared enum
      if (col.type === 'enum' && col.settings.enumValues === undefined) {
        // Check if rawType is a declared enum
        const enumRef = col.rawType
        if (enumRef && !enumNames.has(enumRef)) {
          errors.push({
            type: 'warning',
            message: `Column "${col.name}" references unknown enum "${enumRef}"`,
            location: { table: table.name, column: col.name },
          })
        }
      }
    }

    tableColumnMap.set(table.name, colNames)

    // Warn if no primary key
    if (!hasPrimaryKey) {
      errors.push({
        type: 'warning',
        message: `Table "${table.name}" has no primary key`,
        location: { table: table.name },
      })
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Check relations
  // ─────────────────────────────────────────────────────────────

  for (const rel of schema.relations) {
    // From table exists
    if (!tableNames.has(rel.from.table)) {
      errors.push({
        type: 'error',
        message: `Relation references non-existent table "${rel.from.table}"`,
        location: {
          relation: rel.name ?? `${rel.from.table}.${rel.from.column}`,
        },
      })
    } else {
      const cols = tableColumnMap.get(rel.from.table)
      if (cols && !cols.has(rel.from.column)) {
        errors.push({
          type: 'error',
          message: `Relation references non-existent column "${rel.from.table}.${rel.from.column}"`,
          location: {
            relation: rel.name ?? `${rel.from.table}.${rel.from.column}`,
          },
        })
      }
    }

    // To table exists
    if (!tableNames.has(rel.to.table)) {
      errors.push({
        type: 'error',
        message: `Relation references non-existent table "${rel.to.table}"`,
        location: { relation: rel.name ?? `${rel.to.table}.${rel.to.column}` },
      })
    } else {
      const cols = tableColumnMap.get(rel.to.table)
      if (cols && !cols.has(rel.to.column)) {
        errors.push({
          type: 'error',
          message: `Relation references non-existent column "${rel.to.table}.${rel.to.column}"`,
          location: { relation: rel.name ?? `${rel.to.table}.${rel.to.column}` },
        })
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Check table groups
  // ─────────────────────────────────────────────────────────────

  for (const group of schema.tableGroups) {
    for (const tName of group.tables) {
      if (!tableNames.has(tName)) {
        errors.push({
          type: 'warning',
          message: `TableGroup "${group.name}" references unknown table "${tName}"`,
        })
      }
    }
  }

  return {
    valid: errors.filter((e) => e.type === 'error').length === 0,
    errors,
  }
}
