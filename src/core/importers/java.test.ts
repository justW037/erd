import { describe, it, expect } from 'vitest'
import { importJava } from './java'

describe('Java Importer', () => {
  it('should parse a simple Java class', () => {
    const source = `
      public class User {
        private Integer id;
        private String username;
      }
    `
    const schema = importJava(source)
    expect(schema.tables).toHaveLength(1)
    expect(schema.tables[0].name).toBe('User')
    expect(schema.tables[0].columns).toHaveLength(2)
    expect(schema.tables[0].columns[0].name).toBe('id')
    expect(schema.tables[0].columns[1].name).toBe('username')
  })

  it('should recognize @pk annotation', () => {
    const source = `
      public class User {
        /** @pk */
        private Integer id;
      }
    `
    const schema = importJava(source)
    expect(schema.tables[0].columns[0].settings.primaryKey).toBe(true)
  })

  it('should recognize JPA @Id annotation', () => {
    const source = `
      public class User {
        @Id
        private Integer id;
      }
    `
    const schema = importJava(source)
    expect(schema.tables[0].columns[0].settings.primaryKey).toBe(true)
  })

  it('should map Java types correctly', () => {
    const source = `
      public class Test {
        private Integer intField;
        private Long longField;
        private String stringField;
        private Boolean boolField;
        private LocalDateTime dateTimeField;
      }
    `
    const schema = importJava(source)
    const cols = schema.tables[0].columns
    expect(cols.find((c) => c.name === 'intField')?.type).toBe('int')
    expect(cols.find((c) => c.name === 'longField')?.type).toBe('bigint')
    expect(cols.find((c) => c.name === 'stringField')?.type).toBe('varchar')
    expect(cols.find((c) => c.name === 'boolField')?.type).toBe('boolean')
    expect(cols.find((c) => c.name === 'dateTimeField')?.type).toBe('datetime')
  })

  it('should parse @ref annotations and create relations', () => {
    const source = `
      public class Post {
        /** @ref User.id many-to-one */
        private Integer authorId;
      }
    `
    const schema = importJava(source)
    expect(schema.relations).toHaveLength(1)
    expect(schema.relations[0].from.table).toBe('Post')
    expect(schema.relations[0].from.column).toBe('authorId')
    expect(schema.relations[0].to.table).toBe('User')
    expect(schema.relations[0].to.column).toBe('id')
    expect(schema.relations[0].type).toBe('many-to-one')
  })

  it('should recognize JPA relationship annotations', () => {
    const source = `
      public class Post {
        @ManyToOne
        private Integer authorId;
      }
    `
    const schema = importJava(source)
    // Note: without @ref, we don't know the target table, so no relation is created
    expect(schema.tables[0].columns[0].name).toBe('authorId')
  })

  it('should parse @unique annotation', () => {
    const source = `
      public class User {
        /** @unique */
        private String email;
      }
    `
    const schema = importJava(source)
    expect(schema.tables[0].columns[0].settings.unique).toBe(true)
  })

  it('should parse @notNull annotation', () => {
    const source = `
      public class User {
        /** @notNull */
        private String username;
      }
    `
    const schema = importJava(source)
    expect(schema.tables[0].columns[0].settings.notNull).toBe(true)
  })

  it('should parse @default annotation', () => {
    const source = `
      public class User {
        /** @default active */
        private String status;
      }
    `
    const schema = importJava(source)
    expect(schema.tables[0].columns[0].settings.default).toBe('active')
  })

  it('should handle multiple classes', () => {
    const source = `
      public class User {
        private Integer id;
      }
      public class Post {
        private Integer id;
      }
    `
    const schema = importJava(source)
    expect(schema.tables).toHaveLength(2)
    expect(schema.tables[0].name).toBe('User')
    expect(schema.tables[1].name).toBe('Post')
  })

  it('should parse Java records', () => {
    const source = `
      public record User(Integer id, String username) {}
    `
    const schema = importJava(source)
    expect(schema.tables).toHaveLength(1)
    expect(schema.tables[0].name).toBe('User')
    expect(schema.tables[0].columns).toHaveLength(2)
  })

  it('should handle arrays and collections', () => {
    const source = `
      public class User {
        private String[] tags;
        private List<String> roles;
      }
    `
    const schema = importJava(source)
    const cols = schema.tables[0].columns
    expect(cols.find((c) => c.name === 'tags')?.type).toBe('json')
    expect(cols.find((c) => c.name === 'roles')?.type).toBe('json')
  })
})
