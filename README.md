# ERD Designer

A web-based Database Relationship Diagrams (ERD) design tool built with React, TypeScript, and Vite. Similar to [dbdiagram.io](https://dbdiagram.io/), it allows you to design and visualize database schemas using a simple DSL or by importing TypeScript definitions.

![ERD Designer Screenshot](docs/screenshot.png)

## ✨ Features

### DSL Editor

- **Custom DSL syntax** for defining tables, columns, and relationships
- **Real-time parsing** with error highlighting
- **Syntax similar to DBML** for easy adoption

### Visual Diagram

- **Interactive SVG canvas** with pan, zoom, and drag support
- **Multiple layout algorithms**: Dagre (hierarchical) and Grid
- **Relationship visualization** with crow's foot notation
- **Selection and multi-select** with Shift+Click
- **Zoom controls**: Floating panel with zoom in/out/reset buttons
- **Zoom indicator**: Real-time zoom percentage display

### UI/UX Enhancements

- **🌓 Dark Mode**: System-wide theme toggle with persistence
- **♿ Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **🎨 Multi-language Import**: Visual language selector with sample code
- **🔍 Zoom Controls**: Always-visible floating control panel
- **⌨️ Keyboard Shortcuts**: Ctrl+Z/Y (undo/redo), Ctrl+0 (reset zoom)

### Import/Export

- **Multi-language importers**:
  - **TypeScript**: Interfaces, types, classes with JSDoc annotations
  - **Java**: Classes with JPA annotations or JavaDoc
  - **C#**: Classes with EF annotations or XML docs
  - **Python**: Dataclasses, TypedDict, NamedTuple with comment annotations
- **Annotation support**: `@pk`, `@unique`, `@notNull`, `@default`, `@ref`
- **Export to SVG/PNG**: High-quality diagram export
- **Export to SQL**: Generate DDL for PostgreSQL, MySQL, or SQLite with:
  - Type mapping and constraints
  - Foreign key constraints
  - Index definitions

### Productivity

- **Undo/Redo**: Full history support with keyboard shortcuts
- **Auto-save**: Automatic persistence to localStorage
- **Project files**: Save and load `.erd.json` projects
- **Theme Persistence**: Remembers your dark/light mode preference

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/erd.git
cd erd

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📖 DSL Syntax

### Tables

```sql
Table users {
  id int [pk, increment]
  username varchar(50) [unique, not null]
  email varchar(100) [unique, not null]
  created_at timestamp [default: `now()`]
}

Table posts {
  id int [pk, increment]
  title varchar(200) [not null]
  body text
  author_id int [not null]
  status enum('draft', 'published', 'archived')
}
```

### Relationships

```sql
// One-to-many (posts belong to users)
Ref: posts.author_id > users.id

// One-to-one
Ref: user_profiles.user_id - users.id

// Many-to-many (via junction table)
Ref: post_tags.post_id > posts.id
Ref: post_tags.tag_id > tags.id
```

### Column Attributes

| Attribute        | Description         |
| ---------------- | ------------------- |
| `pk`             | Primary key         |
| `increment`      | Auto-increment      |
| `unique`         | Unique constraint   |
| `not null`       | Not nullable        |
| `null`           | Nullable (default)  |
| `default: value` | Default value       |
| `note: 'text'`   | Column note/comment |

### Data Types

Supports common SQL types:

- `int`, `bigint`, `smallint`
- `varchar(n)`, `char(n)`, `text`
- `boolean`, `bool`
- `date`, `time`, `timestamp`, `datetime`
- `decimal(p,s)`, `numeric`, `float`, `double`
- `uuid`, `json`, `jsonb`
- `enum('val1', 'val2', ...)`

## 📦 Language-Specific Import

### TypeScript

```typescript
/**
 * User account
 */
interface User {
  /** @pk */
  id: number

  /** @unique @notNull */
  email: string

  /** @default "active" */
  status: 'active' | 'inactive'

  createdAt: Date
}

interface Post {
  /** @pk */
  id: number

  title: string

  /**
   * @notNull
   * @ref User.id many-to-one
   */
  authorId: number
}
```

### Java

```java
public class User {
    /**
     * @pk
     */
    @Id
    private Integer id;

    /**
     * @unique
     * @notNull
     */
    @Column(unique = true)
    private String email;
}
```

### C#

```csharp
public class User {
    /// <pk />
    [Key]
    public int Id { get; set; }

    /// <unique />
    /// <notNull />
    [Required]
    public string Email { get; set; }
}
```

### Python

```python
@dataclass
class User:
    id: int  # @pk
    email: str  # @unique @notNull
    status: str = 'active'  # @default active
```

## 🛠️ Scripts

| Script                  | Description              |
| ----------------------- | ------------------------ |
| `npm run dev`           | Start development server |
| `npm run build`         | Build for production     |
| `npm run preview`       | Preview production build |
| `npm run test`          | Run tests                |
| `npm run test:watch`    | Run tests in watch mode  |
| `npm run test:coverage` | Run tests with coverage  |
| `npm run type-check`    | TypeScript type checking |
| `npm run lint`          | Run ESLint               |
| `npm run lint:fix`      | Fix ESLint issues        |
| `npm run format`        | Format with Prettier     |
| `npm run format:check`  | Check code formatting    |

## ⌨️ Keyboard Shortcuts

| Shortcut               | Action                   |
| ---------------------- | ------------------------ |
| `Cmd/Ctrl + Z`         | Undo                     |
| `Cmd/Ctrl + Shift + Z` | Redo                     |
| `F`                    | Fit diagram to view      |
| `0`                    | Reset zoom to 100%       |
| `+` / `-`              | Zoom in/out              |
| `Delete`               | Delete selected elements |
| `Escape`               | Clear selection          |

## 🏗️ Project Structure

```
src/
├── core/
│   ├── parser/        # DSL lexer and parser
│   ├── importers/     # Multi-language importers (TS, Java, C#, Python)
│   ├── ir/            # Intermediate Representation types
│   └── graph/         # Graph model and layout engines
├── components/
│   ├── renderer/      # SVG canvas and nodes
│   └── ui/            # Toolbar, Sidebar, PropertyPanel
├── hooks/             # React hooks (history, viewport)
├── utils/             # Export (SQL/SVG/PNG), persistence utilities
└── __tests__/         # Integration tests (136 tests)
examples/              # Sample files for each language
.github/
└── workflows/         # CI/CD pipelines
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with UI
npm run test:ui
```

91 tests covering:

- DSL lexer and parser
- TypeScript importer
- Schema validation
- Graph builder and layout
- Integration tests

## 🐳 Docker

```bash
# Build image
docker build -t erd-designer .

# Run container
docker run -p 8080:80 erd-designer
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [dbdiagram.io](https://dbdiagram.io/) - Inspiration for the DSL syntax
- [dagre](https://github.com/dagrejs/dagre) - Graph layout library
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - Styling
