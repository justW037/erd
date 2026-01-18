/**
 * Unit tests for Graph Builder
 */

import { describe, it, expect } from 'vitest'
import { buildGraph } from './builder'
import type { DatabaseSchema } from '../ir/types'

describe('Graph Builder', () => {
  describe('buildGraph', () => {
    it('should create empty graph for empty schema', () => {
      const schema: DatabaseSchema = {
        tables: [],
        relations: [],
        enums: [],
        tableGroups: [],
      }

      const graph = buildGraph(schema)
      expect(graph.nodes).toHaveLength(0)
      expect(graph.edges).toHaveLength(0)
    })

    it('should create nodes for tables', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'int', settings: { primaryKey: true } },
              { name: 'name', type: 'varchar', settings: {} },
            ],
            indexes: [],
          },
        ],
        relations: [],
        enums: [],
        tableGroups: [],
      }

      const graph = buildGraph(schema)
      expect(graph.nodes).toHaveLength(1)
      expect(graph.nodes[0].id).toBe('users')
      expect(graph.nodes[0].name).toBe('users')
      expect(graph.nodes[0].columns).toHaveLength(2)
    })

    it('should mark primary key columns', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'int', settings: { primaryKey: true } },
              { name: 'email', type: 'varchar', settings: {} },
            ],
            indexes: [],
          },
        ],
        relations: [],
        enums: [],
        tableGroups: [],
      }

      const graph = buildGraph(schema)
      const pkCol = graph.nodes[0].columns.find((c) => c.name === 'id')
      const nonPkCol = graph.nodes[0].columns.find((c) => c.name === 'email')

      expect(pkCol?.isPrimaryKey).toBe(true)
      expect(nonPkCol?.isPrimaryKey).toBe(false)
    })

    it('should mark foreign key columns', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'posts',
            columns: [
              { name: 'id', type: 'int', settings: { primaryKey: true } },
              { name: 'author_id', type: 'int', settings: {} },
            ],
            indexes: [],
          },
          {
            name: 'users',
            columns: [{ name: 'id', type: 'int', settings: { primaryKey: true } }],
            indexes: [],
          },
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

      const graph = buildGraph(schema)
      const postsNode = graph.nodes.find((n) => n.id === 'posts')
      const fkCol = postsNode?.columns.find((c) => c.name === 'author_id')

      expect(fkCol?.isForeignKey).toBe(true)
    })

    it('should create edges for relations', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'posts',
            columns: [
              { name: 'id', type: 'int', settings: { primaryKey: true } },
              { name: 'author_id', type: 'int', settings: {} },
            ],
            indexes: [],
          },
          {
            name: 'users',
            columns: [{ name: 'id', type: 'int', settings: { primaryKey: true } }],
            indexes: [],
          },
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

      const graph = buildGraph(schema)
      expect(graph.edges).toHaveLength(1)
      expect(graph.edges[0].from.nodeId).toBe('posts')
      expect(graph.edges[0].to.nodeId).toBe('users')
      expect(graph.edges[0].type).toBe('many-to-one')
    })

    it('should handle multiple relations', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'posts',
            columns: [
              { name: 'id', type: 'int', settings: { primaryKey: true } },
              { name: 'author_id', type: 'int', settings: {} },
              { name: 'category_id', type: 'int', settings: {} },
            ],
            indexes: [],
          },
          {
            name: 'users',
            columns: [{ name: 'id', type: 'int', settings: { primaryKey: true } }],
            indexes: [],
          },
          {
            name: 'categories',
            columns: [{ name: 'id', type: 'int', settings: { primaryKey: true } }],
            indexes: [],
          },
        ],
        relations: [
          {
            from: { table: 'posts', column: 'author_id' },
            to: { table: 'users', column: 'id' },
            type: 'many-to-one',
          },
          {
            from: { table: 'posts', column: 'category_id' },
            to: { table: 'categories', column: 'id' },
            type: 'many-to-one',
          },
        ],
        enums: [],
        tableGroups: [],
      }

      const graph = buildGraph(schema)
      expect(graph.edges).toHaveLength(2)
    })

    it('should compute node dimensions based on columns', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'int', settings: { primaryKey: true } },
              { name: 'email', type: 'varchar', settings: {} },
              { name: 'name', type: 'varchar', settings: {} },
              { name: 'created_at', type: 'timestamp', settings: {} },
            ],
            indexes: [],
          },
        ],
        relations: [],
        enums: [],
        tableGroups: [],
      }

      const graph = buildGraph(schema)
      const node = graph.nodes[0]

      // Node should have size based on number of columns
      expect(node.size.height).toBeGreaterThan(0)
      expect(node.size.width).toBeGreaterThan(0)
    })

    it('should handle self-referencing relations', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'categories',
            columns: [
              { name: 'id', type: 'int', settings: { primaryKey: true } },
              { name: 'parent_id', type: 'int', settings: {} },
            ],
            indexes: [],
          },
        ],
        relations: [
          {
            from: { table: 'categories', column: 'parent_id' },
            to: { table: 'categories', column: 'id' },
            type: 'many-to-one',
          },
        ],
        enums: [],
        tableGroups: [],
      }

      const graph = buildGraph(schema)
      expect(graph.edges).toHaveLength(1)
      expect(graph.edges[0].from.nodeId).toBe('categories')
      expect(graph.edges[0].to.nodeId).toBe('categories')
    })
  })
})
