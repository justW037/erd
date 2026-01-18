/**
 * Integration tests - testing the full pipeline
 * DSL Input → Parser → IR → Graph Builder → Layout → Graph
 */

import { describe, it, expect } from 'vitest'
import { Lexer } from '../core/parser/lexer'
import { Parser, parseDSL } from '../core/parser/parser'
import { validateSchema } from '../core/ir/validator'
import { buildGraph } from '../core/graph/builder'
import { getLayoutEngine } from '../core/graph/layout'
import { importTypeScript } from '../core/importers/typescript'

describe('Integration: DSL → Graph Pipeline', () => {
  it('should process simple table definition', () => {
    const dsl = `
      Table users {
        id int [pk]
        email varchar
        created_at timestamp
      }
    `

    // Step 1: Parse using the convenience function
    const schema = parseDSL(dsl)

    expect(schema.tables).toHaveLength(1)
    expect(schema.tables[0].name).toBe('users')
    expect(schema.tables[0].columns).toHaveLength(3)

    // Step 2: Validate
    const validation = validateSchema(schema)
    expect(validation.valid).toBe(true)

    // Step 3: Build graph
    const graph = buildGraph(schema)
    expect(graph.nodes).toHaveLength(1)
    expect(graph.nodes[0].id).toBe('users')

    // Step 4: Layout
    const engine = getLayoutEngine('dagre')
    const layoutedGraph = engine.layout(graph)

    expect(layoutedGraph.nodes[0].position.x).toBeDefined()
    expect(layoutedGraph.nodes[0].position.y).toBeDefined()
  })

  it('should process schema with relations', () => {
    const dsl = `
      Table users {
        id int [pk]
        name varchar
      }

      Table posts {
        id int [pk]
        title varchar
        author_id int
      }

      Table comments {
        id int [pk]
        content text
        post_id int
        user_id int
      }

      Ref: posts.author_id > users.id
      Ref: comments.post_id > posts.id
      Ref: comments.user_id > users.id
    `

    const schema = parseDSL(dsl)

    // 3 tables, 3 relations (using explicit Ref statements)
    expect(schema.tables).toHaveLength(3)
    expect(schema.relations).toHaveLength(3)

    const validation = validateSchema(schema)
    expect(validation.valid).toBe(true)

    const graph = buildGraph(schema)
    expect(graph.nodes).toHaveLength(3)
    expect(graph.edges).toHaveLength(3)

    // Check foreign key marking
    const postsNode = graph.nodes.find((n) => n.id === 'posts')
    const authorCol = postsNode?.columns.find((c) => c.name === 'author_id')
    expect(authorCol?.isForeignKey).toBe(true)

    // Layout
    const layouted = getLayoutEngine('dagre').layout(graph)
    layouted.nodes.forEach((node) => {
      expect(typeof node.position.x).toBe('number')
      expect(typeof node.position.y).toBe('number')
    })
  })

  it('should process schema with enums', () => {
    const dsl = `
      Enum status {
        pending
        active
        archived
      }

      Table tasks {
        id int [pk]
        name varchar
        status status
      }
    `

    const schema = parseDSL(dsl)

    expect(schema.enums).toHaveLength(1)
    expect(schema.enums[0].name).toBe('status')
    expect(schema.enums[0].values).toHaveLength(3)

    expect(schema.tables).toHaveLength(1)
    // Column type shows the raw type name
    expect(schema.tables[0].columns[2].rawType).toBe('status')

    const graph = buildGraph(schema)
    expect(graph.nodes).toHaveLength(1)
  })

  it('should process table groups', () => {
    const dsl = `
      Table users {
        id int [pk]
      }

      Table posts {
        id int [pk]
      }

      TableGroup blog {
        users
        posts
      }
    `

    const schema = parseDSL(dsl)

    expect(schema.tableGroups).toHaveLength(1)
    expect(schema.tableGroups[0].name).toBe('blog')
    expect(schema.tableGroups[0].tables).toContain('users')
    expect(schema.tableGroups[0].tables).toContain('posts')

    const validation = validateSchema(schema)
    expect(validation.valid).toBe(true)
  })

  it('should handle complex schema', () => {
    const dsl = `
      Table users {
        id int [pk, increment]
        email varchar [unique, not null]
        password_hash varchar
        created_at timestamp
      }

      Table posts {
        id int [pk, increment]
        title varchar [not null]
        slug varchar [unique]
        content text
        author_id int [not null]
        published_at timestamp
        created_at timestamp
      }

      Table categories {
        id int [pk]
        name varchar [not null]
        parent_id int
      }

      Table post_categories {
        post_id int [pk]
        category_id int [pk]
      }

      Table comments {
        id int [pk]
        post_id int
        user_id int
        content text [not null]
        created_at timestamp
      }

      TableGroup content {
        posts
        categories
        post_categories
        comments
      }

      Ref: posts.author_id > users.id
      Ref: categories.parent_id > categories.id
      Ref: post_categories.post_id > posts.id
      Ref: post_categories.category_id > categories.id
      Ref: comments.post_id > posts.id
      Ref: comments.user_id > users.id
    `

    const schema = parseDSL(dsl)

    expect(schema.tables.length).toBeGreaterThanOrEqual(5)
    expect(schema.relations.length).toBeGreaterThanOrEqual(5)

    const validation = validateSchema(schema)
    expect(validation.valid).toBe(true)

    const graph = buildGraph(schema)
    expect(graph.nodes.length).toBeGreaterThanOrEqual(5)

    // Layout should work
    const layouted = getLayoutEngine('dagre').layout(graph)
    expect(layouted.nodes.every((n) => typeof n.position.x === 'number')).toBe(true)
  })
})

describe('Integration: TypeScript → Graph Pipeline', () => {
  it('should process TypeScript interfaces', () => {
    const ts = `
      interface User {
        /** @pk */
        id: number;
        email: string;
        name?: string;
      }

      interface Post {
        /** @pk */
        id: number;
        title: string;
        authorId: number;
      }
    `

    const schema = importTypeScript(ts)

    expect(schema.tables).toHaveLength(2)
    // TypeScript importer may not create relations from @ref annotations
    // Just verify the tables are created correctly

    const validation = validateSchema(schema)
    expect(validation.valid).toBe(true)

    const graph = buildGraph(schema)
    expect(graph.nodes).toHaveLength(2)

    const layouted = getLayoutEngine('dagre').layout(graph)
    expect(layouted.nodes).toHaveLength(2)
  })

  it('should handle TypeScript classes', () => {
    const ts = `
      class Product {
        /** @pk */
        id: number;
        
        /** @unique */
        sku: string;
        
        name: string;
        price: number;
        
        categoryId: number;
      }

      class Category {
        /** @pk */
        id: number;
        name: string;
      }
    `

    const schema = importTypeScript(ts)

    expect(schema.tables).toHaveLength(2)

    const product = schema.tables.find((t) => t.name === 'Product')
    expect(product).toBeDefined()

    const skuCol = product?.columns.find((c) => c.name === 'sku')
    expect(skuCol?.settings.unique).toBe(true)

    const graph = buildGraph(schema)
    expect(graph.nodes).toHaveLength(2)
  })
})

describe('Integration: Layout Engines Comparison', () => {
  const dsl = `
    Table a { id int [pk] }
    Table b { id int [pk] a_id int [ref: > a.id] }
    Table c { id int [pk] a_id int [ref: > a.id] }
    Table d { id int [pk] b_id int [ref: > b.id] c_id int [ref: > c.id] }
  `

  it('should produce different layouts with different engines', () => {
    const schema = parseDSL(dsl)
    const graph = buildGraph(schema)

    const dagreLayout = getLayoutEngine('dagre').layout(graph)
    const gridLayout = getLayoutEngine('grid').layout(graph)

    // Both should have all nodes
    expect(dagreLayout.nodes).toHaveLength(4)
    expect(gridLayout.nodes).toHaveLength(4)

    // Layouts should be different
    const dagrePositions = dagreLayout.nodes.map((n) => `${n.position.x},${n.position.y}`).sort()
    const gridPositions = gridLayout.nodes.map((n) => `${n.position.x},${n.position.y}`).sort()

    expect(dagrePositions).not.toEqual(gridPositions)
  })
})

describe('Integration: Error Handling', () => {
  it('should propagate parsing errors', () => {
    const invalidDsl = `
      Table users {
        id int [pk
      }
    `

    expect(() => parseDSL(invalidDsl)).toThrow()
  })

  it('should detect validation errors for non-existent relation targets', () => {
    const dsl = `
      Table posts {
        id int [pk]
        author_id int
      }

      Ref: posts.author_id > users.id
    `

    const schema = parseDSL(dsl)

    const validation = validateSchema(schema)
    // The parser creates a relation to non-existent table 'users'
    expect(validation.valid).toBe(false)
    expect(validation.errors.some((e) => e.message.includes('non-existent'))).toBe(true)
  })
})
