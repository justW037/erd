import { describe, it, expect } from 'vitest'
import { importPython } from './python'

describe('Python Importer', () => {
  it('should parse a simple dataclass', () => {
    const source = `
@dataclass
class User:
    id: int
    username: str
    `
    const schema = importPython(source)
    expect(schema.tables).toHaveLength(1)
    expect(schema.tables[0].name).toBe('User')
    expect(schema.tables[0].columns).toHaveLength(2)
    expect(schema.tables[0].columns[0].name).toBe('id')
    expect(schema.tables[0].columns[1].name).toBe('username')
  })

  it('should recognize # @pk annotation', () => {
    const source = `
@dataclass
class User:
    id: int  # @pk
    `
    const schema = importPython(source)
    expect(schema.tables[0].columns[0].settings.primaryKey).toBe(true)
  })

  it('should map Python types correctly', () => {
    const source = `
@dataclass
class Test:
    int_field: int
    float_field: float
    str_field: str
    bool_field: bool
    datetime_field: datetime
    `
    const schema = importPython(source)
    const cols = schema.tables[0].columns
    expect(cols.find((c) => c.name === 'int_field')?.type).toBe('int')
    expect(cols.find((c) => c.name === 'float_field')?.type).toBe('decimal')
    expect(cols.find((c) => c.name === 'str_field')?.type).toBe('varchar')
    expect(cols.find((c) => c.name === 'bool_field')?.type).toBe('boolean')
    expect(cols.find((c) => c.name === 'datetime_field')?.type).toBe('datetime')
  })

  it('should detect Optional types', () => {
    const source = `
@dataclass
class User:
    optional_field: Optional[str]
    required_field: str
    `
    const schema = importPython(source)
    const cols = schema.tables[0].columns
    expect(cols.find((c) => c.name === 'optional_field')?.settings.notNull).toBeUndefined()
    expect(cols.find((c) => c.name === 'required_field')?.settings.notNull).toBe(true)
  })

  it('should parse # @ref annotations', () => {
    const source = `
@dataclass
class Post:
    author_id: int  # @ref User.id many-to-one
    `
    const schema = importPython(source)
    expect(schema.relations).toHaveLength(1)
    expect(schema.relations[0].from.table).toBe('Post')
    expect(schema.relations[0].from.column).toBe('author_id')
    expect(schema.relations[0].to.table).toBe('User')
    expect(schema.relations[0].to.column).toBe('id')
    expect(schema.relations[0].type).toBe('many-to-one')
  })

  it('should parse # @unique annotation', () => {
    const source = `
@dataclass
class User:
    email: str  # @unique
    `
    const schema = importPython(source)
    expect(schema.tables[0].columns[0].settings.unique).toBe(true)
  })

  it('should parse # @notNull annotation', () => {
    const source = `
@dataclass
class User:
    username: str  # @notNull
    `
    const schema = importPython(source)
    expect(schema.tables[0].columns[0].settings.notNull).toBe(true)
  })

  it('should parse # @default annotation', () => {
    const source = `
@dataclass
class User:
    status: str  # @default active
    `
    const schema = importPython(source)
    expect(schema.tables[0].columns[0].settings.default).toBe('active')
  })

  it('should parse field default values', () => {
    const source = `
@dataclass
class User:
    status: str = 'active'
    count: int = 0
    `
    const schema = importPython(source)
    const cols = schema.tables[0].columns
    expect(cols.find((c) => c.name === 'status')?.settings.default).toBe('active')
    expect(cols.find((c) => c.name === 'count')?.settings.default).toBe(0)
  })

  it('should handle multiple dataclasses', () => {
    const source = `
@dataclass
class User:
    id: int

@dataclass
class Post:
    id: int
    `
    const schema = importPython(source)
    expect(schema.tables).toHaveLength(2)
    expect(schema.tables[0].name).toBe('User')
    expect(schema.tables[1].name).toBe('Post')
  })

  it('should parse TypedDict', () => {
    const source = `
class User(TypedDict):
    id: int
    username: str
    `
    const schema = importPython(source)
    expect(schema.tables).toHaveLength(1)
    expect(schema.tables[0].name).toBe('User')
    expect(schema.tables[0].columns).toHaveLength(2)
  })

  it('should parse NamedTuple', () => {
    const source = `
class User(NamedTuple):
    id: int
    username: str
    `
    const schema = importPython(source)
    expect(schema.tables).toHaveLength(1)
    expect(schema.tables[0].name).toBe('User')
    expect(schema.tables[0].columns).toHaveLength(2)
  })

  it('should handle List and Dict types', () => {
    const source = `
@dataclass
class User:
    tags: List[str]
    metadata: Dict[str, str]
    `
    const schema = importPython(source)
    const cols = schema.tables[0].columns
    expect(cols.find((c) => c.name === 'tags')?.type).toBe('json')
    expect(cols.find((c) => c.name === 'metadata')?.type).toBe('json')
  })
})
