import { StreamLanguage } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

interface DSLState {
  inTable: boolean
  expectTableName: boolean
  expectFieldName: boolean
  expectType: boolean
  inBrackets: boolean
}

/**
 * Custom CodeMirror language definition for the ERD DSL.
 */
export const dslLanguage = StreamLanguage.define<DSLState>({
  name: 'erd-dsl',
  startState() {
    return {
      inTable: false,
      expectTableName: false,
      expectFieldName: false,
      expectType: false,
      inBrackets: false,
    }
  },
  token(stream, state) {
    // Reset state at start of line
    if (stream.sol()) {
      state.expectFieldName = state.inTable
      state.expectType = false
    }

    // Whitespace
    if (stream.eatSpace()) return null

    // Comments
    if (stream.match('//')) { stream.skipToEnd(); return 'comment' }
    if (stream.match('/*')) {
      while (!stream.eol() && !stream.match('*/')) stream.next()
      return 'comment'
    }

    // Strings
    if (stream.match(/^"([^"\\]|\\.)*"/ ) || stream.match(/^'([^'\\]|\\.)*'/) || stream.match(/^`([^`\\]|\\.)*`/)) {
      return 'string'
    }

    // Punctuation & Brackets
    if (stream.match('{')) { state.inTable = true; state.expectFieldName = true; return 'punctuation' }
    if (stream.match('}')) { state.inTable = false; state.expectFieldName = false; return 'punctuation' }
    if (stream.match('[')) { state.inBrackets = true; return 'punctuation' }
    if (stream.match(']')) { state.inBrackets = false; return 'punctuation' }
    if (stream.match(/[:.,]/)) return 'punctuation'
    if (stream.match(/[><-]/)) return 'operator'
    
    // Types with params like varchar(50)
    if (stream.match(/^\([0-9, ]+\)/)) return 'number'
    
    // Numbers
    if (stream.match(/^[0-9]+(?:\.[0-9]+)?/)) return 'number'

    // Keywords
    const reserved = /^(table|enum|ref|note|indexes|tablegroup|as)\b/i
    if (stream.match(reserved)) {
      const word = stream.current().toLowerCase()
      if (word === 'table' || word === 'enum') state.expectTableName = true
      return 'keyword'
    }

    // Identifiers
    if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
      const word = stream.current()

      // Table/Enum Name
      if (state.expectTableName) {
        state.expectTableName = false
        return 'className'
      }

      // Inside [brackets] e.g. [pk, increment, not null]
      if (state.inBrackets) {
        const isModifier = /^(pk|increment|unique|not|null|default)\b/i.test(word)
        return isModifier ? 'modifier' : 'attribute'
      }

      // Inside Table { ... }
      if (state.inTable) {
        if (state.expectFieldName) {
          state.expectFieldName = false
          state.expectType = true
          return 'variableName'
        }
        if (state.expectType) {
          state.expectType = false
          state.expectFieldName = true
          return 'typeName'
        }
      }

      return 'variableName'
    }

    stream.next()
    return null
  },
  tokenTable: {
    comment: t.comment,
    string: t.string,
    number: t.number,
    keyword: t.keyword,
    punctuation: t.punctuation,
    operator: t.operator,
    className: t.className,
    variableName: t.variableName,
    typeName: t.typeName,
    modifier: t.labelName,
    attribute: t.attributeName,
  },
  indent(state, textAfter) {
    if (state.inTable && !textAfter.startsWith('}')) return 2
    return 0
  },
})
