/**
 * DSL Parser — parses tokens into an AST then converts to IR
 */

import { Lexer, Token, TokenType } from './lexer'
import type {
  DatabaseSchema,
  Table,
  Column,
  ColumnType,
  ColumnSettings,
  Relation,
  RelationType,
  DbEnum,
  EnumValue,
  TableGroup,
  Index,
} from '../ir/types'

// ─────────────────────────────────────────────────────────────
// Parser
// ─────────────────────────────────────────────────────────────

export class ParserError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number,
    public value?: string
  ) {
    super(message)
    this.name = 'ParserError'
  }
}

export class Parser {
  private tokens: Token[] = []
  private pos = 0

  parse(input: string): DatabaseSchema {
    const lexer = new Lexer(input)
    this.tokens = lexer.tokenize()
    this.pos = 0

    const schema: DatabaseSchema = {
      tables: [],
      relations: [],
      enums: [],
      tableGroups: [],
    }

    while (!this.isAtEnd()) {
      this.skipNewlines()
      if (this.isAtEnd()) break

      if (this.check('TABLE')) {
        schema.tables.push(this.parseTable())
      } else if (this.check('ENUM')) {
        schema.enums.push(this.parseEnum())
      } else if (this.check('REF')) {
        schema.relations.push(this.parseRef())
      } else if (this.check('TABLEGROUP')) {
        schema.tableGroups.push(this.parseTableGroup())
      } else {
        const tok = this.current()
        throw new ParserError(
          `Unexpected token ${tok.type} ("${tok.value}")`,
          tok.line,
          tok.column,
          tok.value
        )
      }
    }

    return schema
  }

  // ───────────────────────────────────────────────────────────
  // Table
  // ───────────────────────────────────────────────────────────

  private parseTable(): Table {
    this.expect('TABLE')
    const name = this.expect('IDENTIFIER').value
    let alias: string | undefined

    if (this.check('AS')) {
      this.advance()
      alias = this.expect('IDENTIFIER').value
    }

    const table: Table = { name, alias, columns: [], indexes: [] }

    this.expect('LBRACE')
    this.skipNewlines()

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      if (this.check('INDEXES')) {
        this.parseIndexes(table)
      } else if (this.check('NOTE')) {
        table.note = this.parseNote()
      } else if (this.check('IDENTIFIER')) {
        table.columns.push(this.parseColumn())
      } else {
        this.advance()
      }
      this.skipNewlines()
    }

    this.expect('RBRACE')
    return table
  }

  private parseColumn(): Column {
    const name = this.expect('IDENTIFIER').value
    const rawType = this.expect('IDENTIFIER').value
    const type = this.mapColumnType(rawType)

    let length: number | undefined
    let precision: number | undefined
    let scale: number | undefined

    // optional (n) or (p, s)
    if (this.check('LPAREN')) {
      this.advance()
      const first = parseInt(this.expect('NUMBER').value, 10)
      if (this.check('COMMA')) {
        this.advance()
        precision = first
        scale = parseInt(this.expect('NUMBER').value, 10)
      } else {
        length = first
      }
      this.expect('RPAREN')
    }

    const settings: ColumnSettings = { length, precision, scale }

    // optional [settings]
    if (this.check('LBRACKET')) {
      this.advance()
      while (!this.check('RBRACKET') && !this.isAtEnd()) {
        const settingName = this.current().value.toLowerCase()
        this.advance()

        if (settingName === 'pk' || settingName === 'primary' || settingName === 'primary_key') {
          settings.primaryKey = true
        } else if (settingName === 'unique') {
          settings.unique = true
        } else if (settingName === 'not' && this.current().value.toLowerCase() === 'null') {
          this.advance()
          settings.notNull = true
        } else if (settingName === 'notnull' || settingName === 'not_null') {
          settings.notNull = true
        } else if (settingName === 'increment' || settingName === 'auto_increment') {
          settings.autoIncrement = true
        } else if (settingName === 'default') {
          if (this.check('COLON')) this.advance()
          settings.default = this.parseDefaultValue()
        } else if (settingName === 'note') {
          if (this.check('COLON')) this.advance()
          settings.note = this.expect('STRING').value
        }

        if (this.check('COMMA')) this.advance()
      }
      this.expect('RBRACKET')
    }

    return { name, type, rawType, settings }
  }

  private parseDefaultValue(): string | number | boolean | null {
    const tok = this.current()
    this.advance()
    if (tok.type === 'STRING') return tok.value
    if (tok.type === 'NUMBER') return parseFloat(tok.value)
    if (tok.value.toLowerCase() === 'null') return null
    if (tok.value.toLowerCase() === 'true') return true
    if (tok.value.toLowerCase() === 'false') return false
    return tok.value
  }

  private parseIndexes(table: Table): void {
    this.expect('INDEXES')
    this.expect('LBRACE')
    this.skipNewlines()

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      const idx: Index = { columns: [] }

      // index can be: (col1, col2) [unique, name: 'idx_name']
      if (this.check('LPAREN')) {
        this.advance()
        while (!this.check('RPAREN') && !this.isAtEnd()) {
          idx.columns.push(this.expect('IDENTIFIER').value)
          if (this.check('COMMA')) this.advance()
        }
        this.expect('RPAREN')
      } else if (this.check('IDENTIFIER')) {
        idx.columns.push(this.expect('IDENTIFIER').value)
      }

      // settings
      if (this.check('LBRACKET')) {
        this.advance()
        while (!this.check('RBRACKET') && !this.isAtEnd()) {
          const s = this.current().value.toLowerCase()
          this.advance()
          if (s === 'unique') idx.unique = true
          if (s === 'name') {
            if (this.check('COLON')) this.advance()
            idx.name = this.expect('STRING').value
          }
          if (this.check('COMMA')) this.advance()
        }
        this.expect('RBRACKET')
      }

      table.indexes.push(idx)
      this.skipNewlines()
    }

    this.expect('RBRACE')
  }

  // ───────────────────────────────────────────────────────────
  // Enum
  // ───────────────────────────────────────────────────────────

  private parseEnum(): DbEnum {
    this.expect('ENUM')
    const name = this.expect('IDENTIFIER').value
    const values: EnumValue[] = []

    this.expect('LBRACE')
    this.skipNewlines()

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      const valName = this.expect('IDENTIFIER').value
      let note: string | undefined
      if (this.check('LBRACKET')) {
        this.advance()
        if (this.current().value.toLowerCase() === 'note') {
          this.advance()
          if (this.check('COLON')) this.advance()
          note = this.expect('STRING').value
        }
        this.expect('RBRACKET')
      }
      values.push({ name: valName, note })
      this.skipNewlines()
    }

    this.expect('RBRACE')
    return { name, values }
  }

  // ───────────────────────────────────────────────────────────
  // Ref
  // ───────────────────────────────────────────────────────────

  private parseRef(): Relation {
    this.expect('REF')

    let refName: string | undefined
    if (this.check('IDENTIFIER') && this.peekNext()?.type === 'COLON') {
      refName = this.expect('IDENTIFIER').value
    }

    if (this.check('COLON')) this.advance()

    const from = this.parseTableColumn()
    const relType = this.parseRelationType()
    const to = this.parseTableColumn()

    return { name: refName, from, to, type: relType }
  }

  private parseTableColumn(): { table: string; column: string } {
    const table = this.expect('IDENTIFIER').value
    this.expect('DOT')
    const column = this.expect('IDENTIFIER').value
    return { table, column }
  }

  private parseRelationType(): RelationType {
    const tok = this.current()
    this.advance()
    switch (tok.type) {
      case 'REL_ONE_TO_ONE':
        return 'one-to-one'
      case 'REL_ONE_TO_MANY':
        return 'one-to-many'
      case 'REL_MANY_TO_ONE':
        return 'many-to-one'
      case 'REL_MANY_TO_MANY':
        return 'many-to-many'
      default:
        return 'one-to-many'
    }
  }

  // ───────────────────────────────────────────────────────────
  // TableGroup
  // ───────────────────────────────────────────────────────────

  private parseTableGroup(): TableGroup {
    this.expect('TABLEGROUP')
    const name = this.expect('IDENTIFIER').value
    const tables: string[] = []

    this.expect('LBRACE')
    this.skipNewlines()

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      tables.push(this.expect('IDENTIFIER').value)
      this.skipNewlines()
    }

    this.expect('RBRACE')
    return { name, tables }
  }

  // ───────────────────────────────────────────────────────────
  // Note
  // ───────────────────────────────────────────────────────────

  private parseNote(): string {
    this.expect('NOTE')
    if (this.check('COLON')) this.advance()
    return this.expect('STRING').value
  }

  // ───────────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────────

  private mapColumnType(raw: string): ColumnType {
    const lower = raw.toLowerCase()
    const mapping: Record<string, ColumnType> = {
      int: 'int',
      integer: 'int',
      bigint: 'bigint',
      smallint: 'smallint',
      float: 'float',
      double: 'double',
      decimal: 'decimal',
      numeric: 'decimal',
      varchar: 'varchar',
      char: 'char',
      text: 'text',
      bool: 'boolean',
      boolean: 'boolean',
      date: 'date',
      datetime: 'datetime',
      timestamp: 'timestamp',
      time: 'time',
      uuid: 'uuid',
      json: 'json',
      jsonb: 'json',
      blob: 'blob',
      binary: 'blob',
      enum: 'enum',
    }
    return mapping[lower] ?? 'unknown'
  }

  private current(): Token {
    return this.tokens[this.pos]
  }

  private peekNext(): Token | undefined {
    return this.tokens[this.pos + 1]
  }

  private check(type: TokenType): boolean {
    return this.current()?.type === type
  }

  private isAtEnd(): boolean {
    return this.current()?.type === 'EOF' || this.pos >= this.tokens.length
  }

  private advance(): Token {
    const tok = this.current()
    this.pos++
    return tok
  }

  private expect(type: TokenType): Token {
    if (this.check(type)) {
      return this.advance()
    }
    const tok = this.current()
    throw new ParserError(
      `Expected ${type} but got ${tok?.type} ("${tok?.value}")`,
      tok?.line ?? 0,
      tok?.column ?? 0,
      tok?.value
    )
  }

  private skipNewlines(): void {
    while (this.check('NEWLINE')) {
      this.advance()
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Convenience function
// ─────────────────────────────────────────────────────────────

export function parseDSL(input: string): DatabaseSchema {
  const parser = new Parser()
  return parser.parse(input)
}
