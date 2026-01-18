/**
 * Import Panel Component
 *
 * Dedicated panel for importing code from various languages.
 */

import React, { memo, useState, useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { importTypeScript } from '../../core/importers/typescript'
import { importJava } from '../../core/importers/java'
import { importCSharp } from '../../core/importers/csharp'
import { importPython } from '../../core/importers/python'
import type { DatabaseSchema } from '../../core/ir/types'

type Language = 'typescript' | 'java' | 'csharp' | 'python'

interface ImportPanelProps {
  onImport: (schema: DatabaseSchema) => void
}

export const ImportPanel: React.FC<ImportPanelProps> = memo(({ onImport }) => {
  const [language, setLanguage] = useState<Language>('typescript')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const languageOptions: { value: Language; label: string; icon: string }[] = [
    { value: 'typescript', label: 'TypeScript', icon: 'TS' },
    { value: 'java', label: 'Java', icon: 'Java' },
    { value: 'csharp', label: 'C#', icon: 'C#' },
    { value: 'python', label: 'Python', icon: 'Py' },
  ]

  const sampleCode: Record<Language, string> = {
    typescript: `interface User {
  id: number;
  username: string;
  email: string;
  createdAt: Date;
}

interface Post {
  id: number;
  title: string;
  authorId: number; // -> User
  content: string;
}`,
    java: `@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue
    private Long id;
    
    @Column(unique = true)
    private String username;
    
    private String email;
}`,
    csharp: `[Table("users")]
public class User
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Username { get; set; }
    
    public string Email { get; set; }
}`,
    python: `@dataclass
class User:
    """Users table"""
    id: int  # primary key, auto increment
    username: str  # unique, not null
    email: str
    created_at: datetime`,
  }

  const handleImport = useCallback(() => {
    try {
      setError(null)
      let schema: DatabaseSchema

      switch (language) {
        case 'typescript':
          schema = importTypeScript(code)
          break
        case 'java':
          schema = importJava(code)
          break
        case 'csharp':
          schema = importCSharp(code)
          break
        case 'python':
          schema = importPython(code)
          break
        default:
          throw new Error(`Unsupported language: ${language}`)
      }

      onImport(schema)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    }
  }, [language, code, onImport])

  const loadSample = useCallback(() => {
    setCode(sampleCode[language])
    setError(null)
  }, [language, sampleCode])

  return (
    <div className="flex flex-col h-full">
      {/* Language Selector */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-700">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
          Language
        </label>
        <div className="grid grid-cols-4 gap-1">
          {languageOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLanguage(opt.value)}
              className={`px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                language === opt.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
              aria-label={`Select ${opt.label}`}
              aria-pressed={language === opt.value}
            >
              <div className="font-bold">{opt.icon}</div>
              <div className="text-[10px] mt-0.5">{opt.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 flex flex-col p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Code</label>
          <button
            onClick={loadSample}
            className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Load Sample
          </button>
        </div>
        <div className="flex-1">
          <CodeMirror
            value={code}
            height="100%"
            extensions={[javascript()]}
            onChange={(value) => setCode(value)}
            basicSetup={{ lineNumbers: true }}
            className="h-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-3 pb-3">
          <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
            <div className="font-medium mb-1">Import Error</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Import Button */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={handleImport}
          disabled={!code.trim()}
          className="w-full px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Import code and generate schema"
        >
          Import & Generate Schema
        </button>
      </div>
    </div>
  )
})

ImportPanel.displayName = 'ImportPanel'
