/**
 * Unit tests for Schema Validator
 */

import { describe, it, expect } from 'vitest'
import { validateSchema } from './validator'
import type { DatabaseSchema, Table, Relation } from './types'

function createTable(name: string, columns: { name: string; pk?: boolean }[]): Table {
  return {
    name,
    columns: columns.map((c) => ({
      name: c.name,
      type: 'int',
      settings: { primaryKey: c.pk ?? false },
    })),
    indexes: [],
  }
}

describe('Schema Validator', () => {
  describe('table validation', () => {
    it('should pass for valid schema', () => {
      const schema: DatabaseSchema = {
        tables: [createTable('users', [{ name: 'id', pk: true }])],
        relations: [],
        enums: [],
        tableGroups: [],
      }

      const result = validateSchema(schema)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should error on duplicate table names', () => {
      const schema: DatabaseSchema = {
        tables: [
          createTable('users', [{ name: 'id', pk: true }]),
          createTable('users', [{ name: 'id', pk: true }]),
        ],
        relations: [],
        enums: [],
        tableGroups: [],
      }

      const result = validateSchema(schema)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.message.includes('Duplicate table name'))).toBe(true)
    })

    it('should error on duplicate column names', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'int', settings: { primaryKey: true } },
              { name: 'id', type: 'varchar', settings: {} },
            ],
            indexes: [],
          },
        ],
        relations: [],
        enums: [],
        tableGroups: [],
      }

      const result = validateSchema(schema)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.message.includes('Duplicate column'))).toBe(true)
    })

    it('should warn on missing primary key', () => {
      const schema: DatabaseSchema = {
        tables: [createTable('users', [{ name: 'id' }])], // no pk
        relations: [],
        enums: [],
        tableGroups: [],
      }

      const result = validateSchema(schema)
      expect(result.valid).toBe(true) // warnings don't fail validation
      expect(
        result.errors.some((e) => e.type === 'warning' && e.message.includes('no primary key'))
      ).toBe(true)
    })
  })

  describe('relation validation', () => {
    it('should error on relation to non-existent table', () => {
      const schema: DatabaseSchema = {
        tables: [createTable('posts', [{ name: 'id', pk: true }, { name: 'author_id' }])],
        relations: [
          {
            from: { table: 'posts', column: 'author_id' },
            to: { table: 'users', column: 'id' }, // users doesn't exist
            type: 'many-to-one',
          },
        ],
        enums: [],
        tableGroups: [],
      }

      const result = validateSchema(schema)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.message.includes('non-existent table'))).toBe(true)
    })

    it('should error on relation to non-existent column', () => {
      const schema: DatabaseSchema = {
        tables: [
          createTable('posts', [{ name: 'id', pk: true }, { name: 'author_id' }]),
          createTable('users', [{ name: 'id', pk: true }]),
        ],
        relations: [
          {
            from: { table: 'posts', column: 'user_id' }, // wrong column
            to: { table: 'users', column: 'id' },
            type: 'many-to-one',
          },
        ],
        enums: [],
        tableGroups: [],
      }

      const result = validateSchema(schema)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.message.includes('non-existent column'))).toBe(true)
    })

    it('should pass for valid relations', () => {
      const schema: DatabaseSchema = {
        tables: [
          createTable('posts', [{ name: 'id', pk: true }, { name: 'author_id' }]),
          createTable('users', [{ name: 'id', pk: true }]),
        ],
        relations: [
          {
            from: { table: 'posts', column: 'author_id' },
            to: { table: 'users', column: 'id' },
            type: 'many-to-one',
          },
        ],
        enums: [],
        tableGroups: [],
      }

      const result = validateSchema(schema)
      expect(result.valid).toBe(true)
    })
  })

  describe('table group validation', () => {
    it('should warn on table group referencing unknown table', () => {
      const schema: DatabaseSchema = {
        tables: [createTable('users', [{ name: 'id', pk: true }])],
        relations: [],
        enums: [],
        tableGroups: [{ name: 'blog', tables: ['users', 'posts'] }], // posts doesn't exist
      }

      const result = validateSchema(schema)
      expect(result.valid).toBe(true) // warnings don't fail
      expect(
        result.errors.some((e) => e.type === 'warning' && e.message.includes('unknown table'))
      ).toBe(true)
    })
  })

  describe('enum validation', () => {
    it('should warn on column referencing unknown enum', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'posts',
            columns: [
              { name: 'id', type: 'int', settings: { primaryKey: true } },
              {
                name: 'status',
                type: 'enum',
                rawType: 'post_status',
                settings: {},
              },
            ],
            indexes: [],
          },
        ],
        relations: [],
        enums: [], // no enums defined
        tableGroups: [],
      }

      const result = validateSchema(schema)
      expect(result.errors.some((e) => e.message.includes('unknown enum'))).toBe(true)
    })

    it('should pass when enum is defined', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'posts',
            columns: [
              { name: 'id', type: 'int', settings: { primaryKey: true } },
              {
                name: 'status',
                type: 'enum',
                rawType: 'post_status',
                settings: {},
              },
            ],
            indexes: [],
          },
        ],
        relations: [],
        enums: [
          {
            name: 'post_status',
            values: [{ name: 'draft' }, { name: 'published' }],
          },
        ],
        tableGroups: [],
      }

      const result = validateSchema(schema)
      // Should not have enum warning
      expect(result.errors.filter((e) => e.message.includes('unknown enum'))).toHaveLength(0)
    })
  })

  describe('multiple errors', () => {
    it('should collect all errors', () => {
      const schema: DatabaseSchema = {
        tables: [
          createTable('users', [{ name: 'id' }]), // no pk - warning
          createTable('users', [{ name: 'id' }]), // duplicate table - error
        ],
        relations: [
          {
            from: { table: 'posts', column: 'id' }, // non-existent
            to: { table: 'tags', column: 'id' }, // non-existent
            type: 'many-to-many',
          },
        ],
        enums: [],
        tableGroups: [],
      }

      const result = validateSchema(schema)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(2)
    })
  })
})
