/**
 * Unit tests for TypeScript Importer
 */

import { describe, it, expect } from 'vitest'
import { importTypeScript } from './typescript'

describe('TypeScript Importer', () => {
  describe('parse interfaces', () => {
    it('should parse a simple interface', () => {
      const source = `
interface User {
  id: number
  name: string
}
`
      const schema = importTypeScript(source)
      expect(schema.tables).toHaveLength(1)
      expect(schema.tables[0].name).toBe('User')
      expect(schema.tables[0].columns).toHaveLength(2)
    })

    it('should parse exported interface', () => {
      const source = `
export interface Product {
  id: number
  price: number
}
`
      const schema = importTypeScript(source)
      expect(schema.tables[0].name).toBe('Product')
    })

    it('should map TypeScript types to column types', () => {
      const source = `
interface Entity {
  id: number
  name: string
  active: boolean
  createdAt: Date
  data: object
  items: string[]
}
`
      const schema = importTypeScript(source)
      const cols = schema.tables[0].columns

      expect(cols.find((c) => c.name === 'id')?.type).toBe('int')
      expect(cols.find((c) => c.name === 'name')?.type).toBe('varchar')
      expect(cols.find((c) => c.name === 'active')?.type).toBe('boolean')
      expect(cols.find((c) => c.name === 'createdAt')?.type).toBe('datetime')
      expect(cols.find((c) => c.name === 'data')?.type).toBe('json')
      expect(cols.find((c) => c.name === 'items')?.type).toBe('json')
    })

    it('should handle optional properties', () => {
      const source = `
interface User {
  id: number
  nickname?: string
}
`
      const schema = importTypeScript(source)
      const cols = schema.tables[0].columns

      expect(cols.find((c) => c.name === 'id')?.settings.notNull).toBe(true)
      expect(cols.find((c) => c.name === 'nickname')?.settings.notNull).toBeFalsy()
    })
  })

  describe('parse type aliases', () => {
    it('should parse a type alias', () => {
      const source = `
type Post = {
  id: number
  title: string
}
`
      const schema = importTypeScript(source)
      expect(schema.tables).toHaveLength(1)
      expect(schema.tables[0].name).toBe('Post')
    })

    it('should parse exported type alias', () => {
      const source = `
export type Comment = {
  id: number
  content: string
}
`
      const schema = importTypeScript(source)
      expect(schema.tables[0].name).toBe('Comment')
    })
  })

  describe('parse classes', () => {
    it('should parse a simple class', () => {
      const source = `
class Order {
  id: number
  total: number
  status: string
}
`
      const schema = importTypeScript(source)
      expect(schema.tables).toHaveLength(1)
      expect(schema.tables[0].name).toBe('Order')
    })

    it('should parse exported class', () => {
      const source = `
export class Invoice {
  id: number
  amount: number
}
`
      const schema = importTypeScript(source)
      expect(schema.tables[0].name).toBe('Invoice')
    })
  })

  describe('parse JSDoc annotations', () => {
    it('should parse @pk annotation', () => {
      const source = `
interface User {
  /** @pk */
  id: number
  name: string
}
`
      const schema = importTypeScript(source)
      expect(schema.tables[0].columns[0].settings.primaryKey).toBe(true)
    })

    it('should parse @unique annotation', () => {
      const source = `
interface User {
  id: number
  /** @unique */
  email: string
}
`
      const schema = importTypeScript(source)
      const emailCol = schema.tables[0].columns.find((c) => c.name === 'email')
      expect(emailCol?.settings.unique).toBe(true)
    })

    it('should parse @notNull annotation', () => {
      const source = `
interface User {
  id: number
  /** @notNull */
  username: string
}
`
      const schema = importTypeScript(source)
      const usernameCol = schema.tables[0].columns.find((c) => c.name === 'username')
      expect(usernameCol?.settings.notNull).toBe(true)
    })

    it('should parse @default annotation', () => {
      const source = `
interface User {
  id: number
  /** @default 'active' */
  status: string
  /** @default 0 */
  score: number
  /** @default true */
  active: boolean
}
`
      const schema = importTypeScript(source)
      const cols = schema.tables[0].columns

      expect(cols.find((c) => c.name === 'status')?.settings.default).toBe('active')
      expect(cols.find((c) => c.name === 'score')?.settings.default).toBe(0)
      expect(cols.find((c) => c.name === 'active')?.settings.default).toBe(true)
    })

    it('should parse @ref annotation', () => {
      const source = `
interface Post {
  id: number
  /**
   * @ref User.id many-to-one
   */
  authorId: number
}

interface User {
  id: number
}
`
      const schema = importTypeScript(source)
      expect(schema.relations).toHaveLength(1)
      expect(schema.relations[0].from.table).toBe('Post')
      expect(schema.relations[0].from.column).toBe('authorId')
      expect(schema.relations[0].to.table).toBe('User')
      expect(schema.relations[0].to.column).toBe('id')
      expect(schema.relations[0].type).toBe('many-to-one')
    })
  })

  describe('multiple entities', () => {
    it('should parse multiple interfaces', () => {
      const source = `
interface User {
  id: number
  name: string
}

interface Post {
  id: number
  title: string
}

interface Comment {
  id: number
  content: string
}
`
      const schema = importTypeScript(source)
      expect(schema.tables).toHaveLength(3)
      expect(schema.tables.map((t) => t.name)).toEqual(['User', 'Post', 'Comment'])
    })

    it('should parse mixed types (interface, type, class)', () => {
      const source = `
interface User {
  id: number
}

type Post = {
  id: number
}

class Comment {
  id: number
}
`
      const schema = importTypeScript(source)
      expect(schema.tables).toHaveLength(3)
    })
  })

  describe('complex example', () => {
    it('should parse a complete entity with all features', () => {
      const source = `
export interface User {
  /** @pk */
  id: number

  /** @unique @notNull */
  email: string

  /** @notNull */
  username: string

  /** @default 'active' */
  status: string

  createdAt: Date
  updatedAt?: Date
}

export interface Post {
  /** @pk */
  id: number

  title: string

  /**
   * @ref User.id many-to-one
   * @notNull
   */
  authorId: number
}
`
      const schema = importTypeScript(source)

      expect(schema.tables).toHaveLength(2)
      expect(schema.relations).toHaveLength(1)

      const userTable = schema.tables.find((t) => t.name === 'User')!
      expect(userTable.columns.find((c) => c.name === 'id')?.settings.primaryKey).toBe(true)
      expect(userTable.columns.find((c) => c.name === 'email')?.settings.unique).toBe(true)
      expect(userTable.columns.find((c) => c.name === 'status')?.settings.default).toBe('active')
    })
  })
})
