import { describe, it, expect } from 'vitest'
import { importCSharp } from './csharp'

describe('C# Importer', () => {
  it('should parse a simple C# class', () => {
    const source = `
      public class User {
        public int Id { get; set; }
        public string Username { get; set; }
      }
    `
    const schema = importCSharp(source)
    expect(schema.tables).toHaveLength(1)
    expect(schema.tables[0].name).toBe('User')
    expect(schema.tables[0].columns).toHaveLength(2)
    expect(schema.tables[0].columns[0].name).toBe('Id')
    expect(schema.tables[0].columns[1].name).toBe('Username')
  })

  it('should recognize <pk /> XML doc tag', () => {
    const source = `
      public class User {
        /// <pk />
        public int Id { get; set; }
      }
    `
    const schema = importCSharp(source)
    expect(schema.tables[0].columns[0].settings.primaryKey).toBe(true)
  })

  it('should recognize [Key] attribute', () => {
    const source = `
      public class User {
        [Key]
        public int Id { get; set; }
      }
    `
    const schema = importCSharp(source)
    expect(schema.tables[0].columns[0].settings.primaryKey).toBe(true)
  })

  it('should map C# types correctly', () => {
    const source = `
      public class Test {
        public int IntField { get; set; }
        public long LongField { get; set; }
        public string StringField { get; set; }
        public bool BoolField { get; set; }
        public DateTime DateTimeField { get; set; }
        public Guid GuidField { get; set; }
      }
    `
    const schema = importCSharp(source)
    const cols = schema.tables[0].columns
    expect(cols.find((c) => c.name === 'IntField')?.type).toBe('int')
    expect(cols.find((c) => c.name === 'LongField')?.type).toBe('bigint')
    expect(cols.find((c) => c.name === 'StringField')?.type).toBe('varchar')
    expect(cols.find((c) => c.name === 'BoolField')?.type).toBe('boolean')
    expect(cols.find((c) => c.name === 'DateTimeField')?.type).toBe('datetime')
    expect(cols.find((c) => c.name === 'GuidField')?.type).toBe('uuid')
  })

  it('should detect nullable types', () => {
    const source = `
      public class User {
        public string? OptionalField { get; set; }
        public string RequiredField { get; set; }
      }
    `
    const schema = importCSharp(source)
    const cols = schema.tables[0].columns
    expect(cols.find((c) => c.name === 'OptionalField')?.settings.notNull).toBeUndefined()
    expect(cols.find((c) => c.name === 'RequiredField')?.settings.notNull).toBe(true)
  })

  it('should parse <ref> XML doc tags', () => {
    const source = `
      public class Post {
        /// <ref table="User" column="Id" type="many-to-one" />
        public int AuthorId { get; set; }
      }
    `
    const schema = importCSharp(source)
    expect(schema.relations).toHaveLength(1)
    expect(schema.relations[0].from.table).toBe('Post')
    expect(schema.relations[0].from.column).toBe('AuthorId')
    expect(schema.relations[0].to.table).toBe('User')
    expect(schema.relations[0].to.column).toBe('Id')
    expect(schema.relations[0].type).toBe('many-to-one')
  })

  it('should recognize [ForeignKey] attribute', () => {
    const source = `
      public class Post {
        [ForeignKey("User")]
        public int AuthorId { get; set; }
      }
    `
    const schema = importCSharp(source)
    expect(schema.relations).toHaveLength(1)
    expect(schema.relations[0].to.table).toBe('User')
  })

  it('should parse <unique /> tag', () => {
    const source = `
      public class User {
        /// <unique />
        public string Email { get; set; }
      }
    `
    const schema = importCSharp(source)
    expect(schema.tables[0].columns[0].settings.unique).toBe(true)
  })

  it('should parse <notNull /> tag and [Required]', () => {
    const source = `
      public class User {
        /// <notNull />
        public string Username { get; set; }
        [Required]
        public string Email { get; set; }
      }
    `
    const schema = importCSharp(source)
    expect(schema.tables[0].columns[0].settings.notNull).toBe(true)
    expect(schema.tables[0].columns[1].settings.notNull).toBe(true)
  })

  it('should parse <default> tag', () => {
    const source = `
      public class User {
        /// <default>active</default>
        public string Status { get; set; }
      }
    `
    const schema = importCSharp(source)
    expect(schema.tables[0].columns[0].settings.default).toBe('active')
  })

  it('should handle multiple classes', () => {
    const source = `
      public class User {
        public int Id { get; set; }
      }
      public class Post {
        public int Id { get; set; }
      }
    `
    const schema = importCSharp(source)
    expect(schema.tables).toHaveLength(2)
    expect(schema.tables[0].name).toBe('User')
    expect(schema.tables[1].name).toBe('Post')
  })

  it('should parse C# records', () => {
    const source = `
      public record User(int Id, string Username);
    `
    const schema = importCSharp(source)
    expect(schema.tables).toHaveLength(1)
    expect(schema.tables[0].name).toBe('User')
    expect(schema.tables[0].columns).toHaveLength(2)
  })

  it('should handle collections and arrays', () => {
    const source = `
      public class User {
        public string[] Tags { get; set; }
        public List<string> Roles { get; set; }
      }
    `
    const schema = importCSharp(source)
    const cols = schema.tables[0].columns
    expect(cols.find((c) => c.name === 'Tags')?.type).toBe('json')
    expect(cols.find((c) => c.name === 'Roles')?.type).toBe('json')
  })
})
