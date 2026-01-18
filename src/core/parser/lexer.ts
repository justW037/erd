/**
 * DSL Token types for lexer
 */

export type TokenType =
  // Keywords
  | 'TABLE'
  | 'ENUM'
  | 'REF'
  | 'TABLEGROUP'
  | 'AS'
  | 'NOTE'
  | 'INDEXES'
  // Punctuation
  | 'LBRACE'
  | 'RBRACE'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'COLON'
  | 'DOT'
  // Relation operators
  | 'REL_ONE_TO_ONE' // -
  | 'REL_ONE_TO_MANY' // <
  | 'REL_MANY_TO_ONE' // >
  | 'REL_MANY_TO_MANY' // <>
  // Literals
  | 'IDENTIFIER'
  | 'STRING'
  | 'NUMBER'
  // Special
  | 'NEWLINE'
  | 'EOF'
  | 'UNKNOWN'

export interface Token {
  type: TokenType
  value: string
  line: number
  column: number
}

// ─────────────────────────────────────────────────────────────
// Lexer
// ─────────────────────────────────────────────────────────────

const KEYWORDS: Record<string, TokenType> = {
  table: 'TABLE',
  Table: 'TABLE',
  TABLE: 'TABLE',
  enum: 'ENUM',
  Enum: 'ENUM',
  ENUM: 'ENUM',
  ref: 'REF',
  Ref: 'REF',
  REF: 'REF',
  tablegroup: 'TABLEGROUP',
  TableGroup: 'TABLEGROUP',
  as: 'AS',
  note: 'NOTE',
  Note: 'NOTE',
  indexes: 'INDEXES',
  Indexes: 'INDEXES',
}

export class Lexer {
  private input: string
  private pos = 0
  private line = 1
  private column = 1
  private tokens: Token[] = []

  constructor(input: string) {
    this.input = input
  }

  tokenize(): Token[] {
    while (this.pos < this.input.length) {
      this.skipWhitespaceAndComments()
      if (this.pos >= this.input.length) break

      const ch = this.current()

      // Newline
      if (ch === '\n') {
        this.tokens.push(this.makeToken('NEWLINE', '\n'))
        this.advance()
        this.line++
        this.column = 1
        continue
      }

      // String literal
      if (ch === "'" || ch === '"' || ch === '`') {
        this.tokens.push(this.readString(ch))
        continue
      }

      // Number
      if (this.isDigit(ch)) {
        this.tokens.push(this.readNumber())
        continue
      }

      // Identifier or keyword
      if (this.isAlpha(ch) || ch === '_') {
        this.tokens.push(this.readIdentifier())
        continue
      }

      // Punctuation & operators
      switch (ch) {
        case '{':
          this.tokens.push(this.makeToken('LBRACE', ch))
          this.advance()
          break
        case '}':
          this.tokens.push(this.makeToken('RBRACE', ch))
          this.advance()
          break
        case '[':
          this.tokens.push(this.makeToken('LBRACKET', ch))
          this.advance()
          break
        case ']':
          this.tokens.push(this.makeToken('RBRACKET', ch))
          this.advance()
          break
        case '(':
          this.tokens.push(this.makeToken('LPAREN', ch))
          this.advance()
          break
        case ')':
          this.tokens.push(this.makeToken('RPAREN', ch))
          this.advance()
          break
        case ',':
          this.tokens.push(this.makeToken('COMMA', ch))
          this.advance()
          break
        case ':':
          this.tokens.push(this.makeToken('COLON', ch))
          this.advance()
          break
        case '.':
          this.tokens.push(this.makeToken('DOT', ch))
          this.advance()
          break
        case '-':
          this.tokens.push(this.makeToken('REL_ONE_TO_ONE', '-'))
          this.advance()
          break
        case '<':
          if (this.peek() === '>') {
            this.tokens.push(this.makeToken('REL_MANY_TO_MANY', '<>'))
            this.advance()
            this.advance()
          } else {
            this.tokens.push(this.makeToken('REL_ONE_TO_MANY', '<'))
            this.advance()
          }
          break
        case '>':
          this.tokens.push(this.makeToken('REL_MANY_TO_ONE', '>'))
          this.advance()
          break
        default:
          this.tokens.push(this.makeToken('UNKNOWN', ch))
          this.advance()
      }
    }

    this.tokens.push(this.makeToken('EOF', ''))
    return this.tokens
  }

  private current(): string {
    return this.input[this.pos]
  }

  private peek(): string {
    return this.input[this.pos + 1] ?? ''
  }

  private advance(): void {
    this.pos++
    this.column++
  }

  private makeToken(type: TokenType, value: string): Token {
    return { type, value, line: this.line, column: this.column }
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.input.length) {
      const ch = this.current()
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        this.advance()
      } else if (ch === '/' && this.peek() === '/') {
        // line comment
        while (this.pos < this.input.length && this.current() !== '\n') {
          this.advance()
        }
      } else if (ch === '/' && this.peek() === '*') {
        // block comment
        this.advance()
        this.advance()
        while (this.pos < this.input.length) {
          if (this.current() === '*' && this.peek() === '/') {
            this.advance()
            this.advance()
            break
          }
          if (this.current() === '\n') {
            this.line++
            this.column = 0
          }
          this.advance()
        }
      } else {
        break
      }
    }
  }

  private isDigit(ch: string): boolean {
    return /[0-9]/.test(ch)
  }

  private isAlpha(ch: string): boolean {
    return /[a-zA-Z]/.test(ch)
  }

  private isAlphaNumeric(ch: string): boolean {
    return /[a-zA-Z0-9_]/.test(ch)
  }

  private readString(quote: string): Token {
    const start = this.column
    this.advance() // skip opening quote
    let value = ''
    while (this.pos < this.input.length && this.current() !== quote) {
      if (this.current() === '\\') {
        this.advance()
        value += this.current()
      } else {
        value += this.current()
      }
      this.advance()
    }
    this.advance() // skip closing quote
    return { type: 'STRING', value, line: this.line, column: start }
  }

  private readNumber(): Token {
    const start = this.column
    let value = ''
    while (
      this.pos < this.input.length &&
      (this.isDigit(this.current()) || this.current() === '.')
    ) {
      value += this.current()
      this.advance()
    }
    return { type: 'NUMBER', value, line: this.line, column: start }
  }

  private readIdentifier(): Token {
    const start = this.column
    let value = ''
    while (this.pos < this.input.length && this.isAlphaNumeric(this.current())) {
      value += this.current()
      this.advance()
    }
    const type = KEYWORDS[value] ?? 'IDENTIFIER'
    return { type, value, line: this.line, column: start }
  }
}
