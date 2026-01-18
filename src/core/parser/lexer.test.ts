/**
 * Unit tests for DSL Lexer
 */

import { describe, it, expect } from 'vitest'
import { Lexer, Token } from './lexer'

describe('Lexer', () => {
  describe('tokenize keywords', () => {
    it('should tokenize TABLE keyword', () => {
      const lexer = new Lexer('Table')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe('TABLE')
    })

    it('should tokenize ENUM keyword', () => {
      const lexer = new Lexer('Enum')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe('ENUM')
    })

    it('should tokenize REF keyword', () => {
      const lexer = new Lexer('Ref')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe('REF')
    })

    it('should tokenize TABLEGROUP keyword', () => {
      const lexer = new Lexer('TableGroup')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe('TABLEGROUP')
    })
  })

  describe('tokenize punctuation', () => {
    it('should tokenize braces', () => {
      const lexer = new Lexer('{}')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe('LBRACE')
      expect(tokens[1].type).toBe('RBRACE')
    })

    it('should tokenize brackets', () => {
      const lexer = new Lexer('[]')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe('LBRACKET')
      expect(tokens[1].type).toBe('RBRACKET')
    })

    it('should tokenize parentheses', () => {
      const lexer = new Lexer('()')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe('LPAREN')
      expect(tokens[1].type).toBe('RPAREN')
    })
  })

  describe('tokenize relation operators', () => {
    it('should tokenize one-to-one (-)', () => {
      const lexer = new Lexer('-')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe('REL_ONE_TO_ONE')
    })

    it('should tokenize one-to-many (<)', () => {
      const lexer = new Lexer('<')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe('REL_ONE_TO_MANY')
    })

    it('should tokenize many-to-one (>)', () => {
      const lexer = new Lexer('>')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe('REL_MANY_TO_ONE')
    })

    it('should tokenize many-to-many (<>)', () => {
      const lexer = new Lexer('<>')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe('REL_MANY_TO_MANY')
    })
  })

  describe('tokenize literals', () => {
    it('should tokenize identifiers', () => {
      const lexer = new Lexer('users posts_table')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe('IDENTIFIER')
      expect(tokens[0].value).toBe('users')
      expect(tokens[1].type).toBe('IDENTIFIER')
      expect(tokens[1].value).toBe('posts_table')
    })

    it('should tokenize numbers', () => {
      const lexer = new Lexer('123 45.67')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe('NUMBER')
      expect(tokens[0].value).toBe('123')
      expect(tokens[1].type).toBe('NUMBER')
      expect(tokens[1].value).toBe('45.67')
    })

    it('should tokenize single-quoted strings', () => {
      const lexer = new Lexer("'hello world'")
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe('STRING')
      expect(tokens[0].value).toBe('hello world')
    })

    it('should tokenize double-quoted strings', () => {
      const lexer = new Lexer('"hello world"')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe('STRING')
      expect(tokens[0].value).toBe('hello world')
    })
  })

  describe('handle comments', () => {
    it('should skip line comments', () => {
      const lexer = new Lexer('Table // this is a comment\nusers')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe('TABLE')
      expect(tokens[1].type).toBe('NEWLINE')
      expect(tokens[2].type).toBe('IDENTIFIER')
      expect(tokens[2].value).toBe('users')
    })

    it('should skip block comments', () => {
      const lexer = new Lexer('Table /* block comment */ users')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe('TABLE')
      expect(tokens[1].type).toBe('IDENTIFIER')
      expect(tokens[1].value).toBe('users')
    })
  })

  describe('token positions', () => {
    it('should track line and column', () => {
      const lexer = new Lexer('Table users {\n  id int\n}')
      const tokens = lexer.tokenize()

      expect(tokens[0].line).toBe(1)
      expect(tokens[0].column).toBe(1)

      // 'id' should be on line 2
      const idToken = tokens.find((t) => t.value === 'id')
      expect(idToken?.line).toBe(2)
    })
  })

  describe('complete table definition', () => {
    it('should tokenize a full table definition', () => {
      const input = `
Table users {
  id int [pk]
  name varchar(50)
}
`.trim()
      const lexer = new Lexer(input)
      const tokens = lexer.tokenize()

      const types = tokens.map((t) => t.type)
      expect(types).toContain('TABLE')
      expect(types).toContain('IDENTIFIER')
      expect(types).toContain('LBRACE')
      expect(types).toContain('LBRACKET')
      expect(types).toContain('RBRACKET')
      expect(types).toContain('LPAREN')
      expect(types).toContain('RPAREN')
      expect(types).toContain('RBRACE')
      expect(types).toContain('EOF')
    })
  })
})
