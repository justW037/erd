/**
 * Schema Diff Utility (Task 44)
 *
 * Compares two DatabaseSchema objects and returns a structured diff.
 */

import type { DatabaseSchema, Table, Column, Relation } from '../ir/types'

export interface ColumnDiff {
  name: string
  action: 'added' | 'removed' | 'modified' | 'unchanged'
  oldType?: string
  newType?: string
  changes?: string[]
}

export interface TableDiff {
  name: string
  action: 'added' | 'removed' | 'modified' | 'unchanged'
  columnDiffs: ColumnDiff[]
  changes?: string[]
}

export interface RelationDiff {
  id: string
  action: 'added' | 'removed' | 'unchanged'
  description: string
}

export interface SchemaDiff {
  tables: TableDiff[]
  relations: RelationDiff[]
  hasChanges: boolean
}

export function diffSchemas(oldSchema: DatabaseSchema, newSchema: DatabaseSchema): SchemaDiff {
  const tableDiffs: TableDiff[] = []
  const relationDiffs: RelationDiff[] = []

  const oldTables = new Map(oldSchema.tables.map((t) => [t.name, t]))
  const newTables = new Map(newSchema.tables.map((t) => [t.name, t]))

  // 1. Process tables
  const allTableNames = new Set([...oldTables.keys(), ...newTables.keys()])

  for (const tableName of allTableNames) {
    const oldTable = oldTables.get(tableName)
    const newTable = newTables.get(tableName)

    if (!oldTable && newTable) {
      // Added table
      tableDiffs.push({
        name: tableName,
        action: 'added',
        columnDiffs: newTable.columns.map((c) => ({
          name: c.name,
          action: 'added',
          newType: c.rawType ?? c.type,
        })),
      })
    } else if (oldTable && !newTable) {
      // Removed table
      tableDiffs.push({
        name: tableName,
        action: 'removed',
        columnDiffs: oldTable.columns.map((c) => ({
          name: c.name,
          action: 'removed',
          oldType: c.rawType ?? c.type,
        })),
      })
    } else if (oldTable && newTable) {
      // Potentially modified table
      const columnDiffs: ColumnDiff[] = []
      const oldCols = new Map(oldTable.columns.map((c) => [c.name, c]))
      const newCols = new Map(newTable.columns.map((c) => [c.name, c]))
      const allColNames = new Set([...oldCols.keys(), ...newCols.keys()])

      let tableModified = false

      for (const colName of allColNames) {
        const oldCol = oldCols.get(colName)
        const newCol = newCols.get(colName)

        if (!oldCol && newCol) {
          columnDiffs.push({ name: colName, action: 'added', newType: newCol.rawType ?? newCol.type })
          tableModified = true
        } else if (oldCol && !newCol) {
          columnDiffs.push({ name: colName, action: 'removed', oldType: oldCol.rawType ?? oldCol.type })
          tableModified = true
        } else if (oldCol && newCol) {
          const changes: string[] = []
          const oldType = oldCol.rawType ?? oldCol.type
          const newType = newCol.rawType ?? newCol.type

          if (oldType !== newType) changes.push(`Type changed from ${oldType} to ${newType}`)
          if (oldCol.settings.primaryKey !== newCol.settings.primaryKey)
            changes.push(newCol.settings.primaryKey ? 'Set as Primary Key' : 'Removed Primary Key')
          if (oldCol.settings.notNull !== newCol.settings.notNull)
            changes.push(newCol.settings.notNull ? 'Set as Not Null' : 'Set as Nullable')

          if (changes.length > 0) {
            columnDiffs.push({
              name: colName,
              action: 'modified',
              oldType,
              newType,
              changes,
            })
            tableModified = true
          } else {
            columnDiffs.push({ name: colName, action: 'unchanged' })
          }
        }
      }

      tableDiffs.push({
        name: tableName,
        action: tableModified ? 'modified' : 'unchanged',
        columnDiffs,
      })
    }
  }

  // 2. Process relations
  const relId = (r: Relation) => `${r.from.table}.${r.from.column}->${r.to.table}.${r.to.column}`
  const oldRels = new Map(oldSchema.relations.map((r) => [relId(r), r]))
  const newRels = new Map(newSchema.relations.map((r) => [relId(r), r]))
  const allRelIds = new Set([...oldRels.keys(), ...newRels.keys()])

  for (const id of allRelIds) {
    const oldRel = oldRels.get(id)
    const newRel = newRels.get(id)

    if (!oldRel && newRel) {
      relationDiffs.push({ id, action: 'added', description: id })
    } else if (oldRel && !newRel) {
      relationDiffs.push({ id, action: 'removed', description: id })
    } else {
      relationDiffs.push({ id, action: 'unchanged', description: id })
    }
  }

  const hasChanges =
    tableDiffs.some((t) => t.action !== 'unchanged') ||
    relationDiffs.some((r) => r.action !== 'unchanged')

  return {
    tables: tableDiffs,
    relations: relationDiffs,
    hasChanges,
  }
}
