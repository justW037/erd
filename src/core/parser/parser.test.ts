/**
 * Unit tests for DSL Parser
 */

import { describe, it, expect } from 'vitest'
import { Parser, parseDSL } from './parser'

describe('Parser', () => {
  describe('parse tables', () => {
    it('should parse a simple table', () => {
      const dsl = `
Table users {
  id int
  name varchar
}
`
      const schema = parseDSL(dsl)
      expect(schema.tables).toHaveLength(1)
      expect(schema.tables[0].name).toBe('users')
      expect(schema.tables[0].columns).toHaveLength(2)
    })

    it('should parse column types correctly', () => {
      const dsl = `
Table products {
  id int
  price decimal
  name varchar
  active boolean
  data json
}
`
      const schema = parseDSL(dsl)
      const cols = schema.tables[0].columns

      expect(cols[0].type).toBe('int')
      expect(cols[1].type).toBe('decimal')
      expect(cols[2].type).toBe('varchar')
      expect(cols[3].type).toBe('boolean')
      expect(cols[4].type).toBe('json')
    })

    it('should parse column settings', () => {
      const dsl = `
Table users {
  id int [pk, increment]
  email varchar [unique, not null]
  status varchar [default: 'active']
}
`
      const schema = parseDSL(dsl)
      const cols = schema.tables[0].columns

      expect(cols[0].settings.primaryKey).toBe(true)
      expect(cols[0].settings.autoIncrement).toBe(true)
      expect(cols[1].settings.unique).toBe(true)
      expect(cols[1].settings.notNull).toBe(true)
      expect(cols[2].settings.default).toBe('active')
    })

    it('should parse type with length', () => {
      const dsl = `
Table users {
  name varchar(100)
  code char(10)
}
`
      const schema = parseDSL(dsl)
      const cols = schema.tables[0].columns

      expect(cols[0].settings.length).toBe(100)
      expect(cols[1].settings.length).toBe(10)
    })

    it('should parse type with precision and scale', () => {
      const dsl = `
Table products {
  price decimal(10, 2)
}
`
      const schema = parseDSL(dsl)
      const col = schema.tables[0].columns[0]

      expect(col.settings.precision).toBe(10)
      expect(col.settings.scale).toBe(2)
    })

    it('should parse table alias', () => {
      const dsl = `
Table users as U {
  id int
}
`
      const schema = parseDSL(dsl)
      expect(schema.tables[0].alias).toBe('U')
    })

    it('should parse table note', () => {
      const dsl = `
Table users {
  id int
  Note: 'User accounts'
}
`
      const schema = parseDSL(dsl)
      expect(schema.tables[0].note).toBe('User accounts')
    })

    it('should parse indexes', () => {
      const dsl = `
Table users {
  id int
  email varchar
  
  indexes {
    email [unique]
    (id, email) [name: 'idx_composite']
  }
}
`
      const schema = parseDSL(dsl)
      const indexes = schema.tables[0].indexes

      expect(indexes).toHaveLength(2)
      expect(indexes[0].columns).toEqual(['email'])
      expect(indexes[0].unique).toBe(true)
      expect(indexes[1].columns).toEqual(['id', 'email'])
      expect(indexes[1].name).toBe('idx_composite')
    })
  })

  describe('parse enums', () => {
    it('should parse a simple enum', () => {
      const dsl = `
Enum status {
  pending
  active
  inactive
}
`
      const schema = parseDSL(dsl)
      expect(schema.enums).toHaveLength(1)
      expect(schema.enums[0].name).toBe('status')
      expect(schema.enums[0].values).toHaveLength(3)
      expect(schema.enums[0].values.map((v) => v.name)).toEqual(['pending', 'active', 'inactive'])
    })

    it('should parse enum value with note', () => {
      const dsl = `
Enum priority {
  low [note: 'Low priority']
  high
}
`
      const schema = parseDSL(dsl)
      expect(schema.enums[0].values[0].note).toBe('Low priority')
    })
  })

  describe('parse relations', () => {
    it('should parse one-to-many relation', () => {
      const dsl = `
Table posts {
  id int
  author_id int
}
Table users {
  id int
}
Ref: posts.author_id > users.id
`
      const schema = parseDSL(dsl)
      expect(schema.relations).toHaveLength(1)
      expect(schema.relations[0].from.table).toBe('posts')
      expect(schema.relations[0].from.column).toBe('author_id')
      expect(schema.relations[0].to.table).toBe('users')
      expect(schema.relations[0].to.column).toBe('id')
      expect(schema.relations[0].type).toBe('many-to-one')
    })

    it('should parse one-to-one relation', () => {
      const dsl = `
Table profiles {
  id int
  user_id int
}
Table users {
  id int
}
Ref: profiles.user_id - users.id
`
      const schema = parseDSL(dsl)
      expect(schema.relations[0].type).toBe('one-to-one')
    })

    it('should parse many-to-many relation', () => {
      const dsl = `
Table posts {
  id int
}
Table tags {
  id int
}
Ref: posts.id <> tags.id
`
      const schema = parseDSL(dsl)
      expect(schema.relations[0].type).toBe('many-to-many')
    })
  })

  describe('parse table groups', () => {
    it('should parse a table group', () => {
      const dsl = `
Table users {
  id int
}
Table posts {
  id int
}
TableGroup blog {
  users
  posts
}
`
      const schema = parseDSL(dsl)
      expect(schema.tableGroups).toHaveLength(1)
      expect(schema.tableGroups[0].name).toBe('blog')
      expect(schema.tableGroups[0].tables).toEqual(['users', 'posts'])
    })
  })

  describe('complex schemas', () => {
    it('should parse a complete blog schema', () => {
      const dsl = `
Table users {
  id int [pk, increment]
  username varchar(50) [unique, not null]
  email varchar(100) [unique]
  created_at timestamp
}

Table posts {
  id int [pk, increment]
  title varchar(200) [not null]
  body text
  author_id int [not null]
  status post_status [default: 'draft']
}

Enum post_status {
  draft
  published
  archived
}

Table comments {
  id int [pk, increment]
  post_id int [not null]
  user_id int [not null]
  content text [not null]
}

Ref: posts.author_id > users.id
Ref: comments.post_id > posts.id
Ref: comments.user_id > users.id

TableGroup blog {
  users
  posts
  comments
}
`
      const schema = parseDSL(dsl)

      expect(schema.tables).toHaveLength(3)
      expect(schema.enums).toHaveLength(1)
      expect(schema.relations).toHaveLength(3)
      expect(schema.tableGroups).toHaveLength(1)
    })
  })

  describe('error handling', () => {
    it('should throw on unexpected token', () => {
      const dsl = 'Table { }'
      expect(() => parseDSL(dsl)).toThrow()
    })
  })
})
