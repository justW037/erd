/**
 * Property Panel Component
 *
 * Displays and edits properties of selected table/column/group.
 */

import React, { memo, useCallback, useState, useMemo } from 'react'
import type { TableNode, ColumnNode, Edge, TableGroup } from '../../core/graph/types'

// ─────────────────────────────────────────────────────────────
// Section Component
// ─────────────────────────────────────────────────────────────

interface SectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

const Section: React.FC<SectionProps> = memo(({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-slate-200 dark:border-slate-700">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        {title}
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
})

Section.displayName = 'Section'

// ─────────────────────────────────────────────────────────────
// Form Fields
// ─────────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  children: React.ReactNode
}

const Field: React.FC<FieldProps> = memo(({ label, children }) => (
  <div className="mb-2">
    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</label>
    {children}
  </div>
))

Field.displayName = 'Field'

const TextInput: React.FC<{
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}> = memo(({ value, onChange, placeholder, disabled }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
  />
))

TextInput.displayName = 'TextInput'

const Checkbox: React.FC<{
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}> = memo(({ checked, onChange, label, disabled }) => (
  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
    />
    {label}
  </label>
))

Checkbox.displayName = 'Checkbox'

const Select: React.FC<{
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}> = memo(({ value, onChange, options, disabled }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
  >
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
))

Select.displayName = 'Select'

// ─────────────────────────────────────────────────────────────
// Table Properties
// ─────────────────────────────────────────────────────────────

interface TablePropertiesProps {
  table: TableNode
  onUpdate: (updates: Partial<TableNode>) => void
  groups?: TableGroup[]
  onAssign?: (tableId: string, groupId?: string) => void
}

const TableProperties: React.FC<TablePropertiesProps> = memo(
  ({ table, onUpdate, groups = [], onAssign }) => {
    const colorOptions = [
      { value: '#3b82f6', label: 'Blue' },
      { value: '#10b981', label: 'Green' },
      { value: '#f59e0b', label: 'Orange' },
      { value: '#ef4444', label: 'Red' },
      { value: '#8b5cf6', label: 'Purple' },
      { value: '#ec4899', label: 'Pink' },
      { value: '#6b7280', label: 'Gray' },
    ]

    return (
      <Section title="Table Properties">
        <Field label="Name">
          <TextInput
            value={table.name}
            onChange={(name) => onUpdate({ name })}
            placeholder="Table name"
          />
        </Field>

        <Field label="Schema">
          <TextInput
            value={table.schema ?? ''}
            onChange={(schema) => onUpdate({ schema: schema || undefined })}
            placeholder="public"
          />
        </Field>

        <Field label="Color">
          <div className="flex gap-1">
            {colorOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onUpdate({ color: opt.value })}
                className={`w-6 h-6 rounded border-2 ${
                  table.color === opt.value ? 'border-slate-800' : 'border-transparent'
                }`}
                style={{ backgroundColor: opt.value }}
                title={opt.label}
              />
            ))}
          </div>
        </Field>

        <Field label="Group">
          <Select
            value={table.group ?? ''}
            onChange={(val) => {
              onUpdate({ group: val || undefined })
              onAssign?.(table.id, val || undefined)
            }}
            options={[
              { value: '', label: 'None' },
              ...groups.map((g) => ({ value: g.id, label: g.name })),
            ]}
          />
        </Field>

        <Field label="Note">
          <textarea
            value={table.note ?? ''}
            onChange={(e) => onUpdate({ note: e.target.value || undefined })}
            placeholder="Add a note..."
            className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-16 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          />
        </Field>

        <div className="mt-3">
          <Checkbox
            checked={table.collapsed ?? false}
            onChange={(collapsed) => onUpdate({ collapsed })}
            label="Collapsed"
          />
        </div>
      </Section>
    )
  }
)

TableProperties.displayName = 'TableProperties'

// ─────────────────────────────────────────────────────────────
// Column List
// ─────────────────────────────────────────────────────────────

interface ColumnListProps {
  columns: ColumnNode[]
  onSelectColumn: (columnId: string) => void
  selectedColumnId?: string
}

const ColumnList: React.FC<ColumnListProps> = memo(
  ({ columns, onSelectColumn, selectedColumnId }) => {
    return (
      <Section title={`Columns (${columns.length})`}>
        <div className="space-y-1">
          {columns.map((col) => (
            <button
              key={col.id}
              onClick={() => onSelectColumn(col.id)}
              className={`w-full px-2 py-1.5 text-left text-sm rounded flex items-center gap-2 ${
                selectedColumnId === col.id
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}
            >
              {col.isPrimaryKey && <span className="text-yellow-500">🔑</span>}
              {col.isForeignKey && !col.isPrimaryKey && <span className="text-purple-500">🔗</span>}
              {!col.isPrimaryKey && !col.isForeignKey && <span className="w-4" />}
              <span className="flex-1 truncate">{col.name}</span>
              <span className="text-xs text-slate-400">{col.type}</span>
            </button>
          ))}
        </div>
      </Section>
    )
  }
)

ColumnList.displayName = 'ColumnList'

// ─────────────────────────────────────────────────────────────
// Column Properties
// ─────────────────────────────────────────────────────────────

interface ColumnPropertiesProps {
  column: ColumnNode
  onUpdate: (columnId: string, updates: Partial<ColumnNode>) => void
}

const ColumnProperties: React.FC<ColumnPropertiesProps> = memo(({ column, onUpdate }) => {
  const typeOptions = [
    { value: 'int', label: 'INT' },
    { value: 'bigint', label: 'BIGINT' },
    { value: 'varchar', label: 'VARCHAR' },
    { value: 'text', label: 'TEXT' },
    { value: 'boolean', label: 'BOOLEAN' },
    { value: 'timestamp', label: 'TIMESTAMP' },
    { value: 'date', label: 'DATE' },
    { value: 'uuid', label: 'UUID' },
    { value: 'json', label: 'JSON' },
    { value: 'float', label: 'FLOAT' },
    { value: 'decimal', label: 'DECIMAL' },
  ]

  return (
    <Section title="Column Properties">
      <Field label="Name">
        <TextInput value={column.name} onChange={(name) => onUpdate(column.id, { name })} />
      </Field>

      <Field label="Type">
        <Select
          value={column.type}
          onChange={(type) => onUpdate(column.id, { type })}
          options={typeOptions}
        />
      </Field>

      <div className="space-y-2 mt-3">
        <Checkbox
          checked={column.isPrimaryKey}
          onChange={(isPrimaryKey) => onUpdate(column.id, { isPrimaryKey })}
          label="Primary Key"
        />
        <Checkbox
          checked={column.isUnique}
          onChange={(isUnique) => onUpdate(column.id, { isUnique })}
          label="Unique"
        />
        <Checkbox
          checked={!column.isNullable}
          onChange={(notNull) => onUpdate(column.id, { isNullable: !notNull })}
          label="Not Null"
        />
      </div>
    </Section>
  )
})

ColumnProperties.displayName = 'ColumnProperties'

// ─────────────────────────────────────────────────────────────
// Edge Properties
// ─────────────────────────────────────────────────────────────

interface EdgePropertiesProps {
  edge: Edge
  onUpdate: (updates: Partial<Edge>) => void
}

const EdgeProperties: React.FC<EdgePropertiesProps> = memo(({ edge, onUpdate }) => {
  return (
    <Section title="Edge Properties">
      <Field label="Type">
        <TextInput value={edge.type} onChange={() => {}} disabled />
      </Field>

      <Field label="Curvature">
        <div className="flex gap-2 items-center">
          <input
            type="range"
            min="0"
            max="4"
            step="0.1"
            value={edge.curvature ?? 1.0}
            onChange={(e) => onUpdate({ curvature: Number(e.target.value) })}
            className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <input
            type="number"
            min="0"
            max="4"
            step="0.1"
            value={edge.curvature ?? 1.0}
            onChange={(e) => onUpdate({ curvature: Number(e.target.value) })}
            className="w-16 px-1 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
          />
        </div>
      </Field>

      <Field label="Label">
        <TextInput
          value={edge.label ?? ''}
          onChange={(label) => onUpdate({ label: label || undefined })}
          placeholder="Relationship label"
        />
      </Field>
    </Section>
  )
})

EdgeProperties.displayName = 'EdgeProperties'

// ─────────────────────────────────────────────────────────────
// Group Properties (Task 44)
// ─────────────────────────────────────────────────────────────

interface GroupPropertiesProps {
  group: TableGroup
  onUpdate: (updates: Partial<TableGroup>) => void
}

const GroupProperties: React.FC<GroupPropertiesProps> = memo(({ group, onUpdate }) => {
  const colorOptions = [
    { value: '#64748b', label: 'Slate' },
    { value: '#3b82f6', label: 'Blue' },
    { value: '#10b981', label: 'Green' },
    { value: '#f59e0b', label: 'Orange' },
    { value: '#ef4444', label: 'Red' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#ec4899', label: 'Pink' },
  ]

  return (
    <Section title="Group Properties">
      <Field label="Name">
        <TextInput
          value={group.name}
          onChange={(name) => onUpdate({ name })}
          placeholder="Group name"
        />
      </Field>

      <Field label="Color (Outline)">
        <div className="flex gap-1">
          {colorOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate({ color: opt.value })}
              className={`w-6 h-6 rounded border-2 ${
                group.color === opt.value
                  ? 'border-slate-800 dark:border-white'
                  : 'border-transparent'
              }`}
              style={{ backgroundColor: opt.value }}
              title={opt.label}
            />
          ))}
        </div>
      </Field>

      <div className="mt-3">
        <Checkbox
          checked={group.collapsed ?? false}
          onChange={(collapsed) => onUpdate({ collapsed })}
          label="Collapsed"
        />
      </div>
    </Section>
  )
})

GroupProperties.displayName = 'GroupProperties'

// ─────────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────────

const EmptyState: React.FC = memo(() => (
  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
      <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </div>
    <p className="text-sm text-slate-500 dark:text-slate-400">
      Select a table or group to edit its properties
    </p>
  </div>
))

EmptyState.displayName = 'EmptyState'

// ─────────────────────────────────────────────────────────────
// Property Panel
// ─────────────────────────────────────────────────────────────

export interface PropertyPanelProps {
  selectedTable: TableNode | null
  selectedEdge: Edge | null
  selectedGroup: TableGroup | null
  onTableUpdate: (tableId: string, updates: Partial<TableNode>) => void
  onColumnUpdate: (tableId: string, columnId: string, updates: Partial<ColumnNode>) => void
  onEdgeUpdate: (edgeId: string, updates: Partial<Edge>) => void
  onGroupUpdate: (groupId: string, updates: Partial<TableGroup>) => void
  groups?: TableGroup[]
  onAssignTableToGroup?: (tableId: string, groupId?: string) => void
}

export const PropertyPanel: React.FC<PropertyPanelProps> = memo(
  ({
    selectedTable,
    selectedEdge,
    selectedGroup,
    onTableUpdate,
    onColumnUpdate,
    onEdgeUpdate,
    onGroupUpdate,
    groups,
    onAssignTableToGroup,
  }) => {
    const [selectedColumnId, setSelectedColumnId] = useState<string | undefined>()

    const selectedColumn = useMemo(() => {
      return selectedTable?.columns.find((c) => c.id === selectedColumnId)
    }, [selectedTable, selectedColumnId])

    const handleTableUpdate = useCallback(
      (updates: Partial<TableNode>) => {
        if (selectedTable) {
          onTableUpdate(selectedTable.id, updates)
        }
      },
      [selectedTable, onTableUpdate]
    )

    const handleColumnUpdate = useCallback(
      (columnId: string, updates: Partial<ColumnNode>) => {
        if (selectedTable) {
          onColumnUpdate(selectedTable.id, columnId, updates)
        }
      },
      [selectedTable, onColumnUpdate]
    )

    const handleEdgeUpdate = useCallback(
      (updates: Partial<Edge>) => {
        if (selectedEdge) {
          onEdgeUpdate(selectedEdge.id, updates)
        }
      },
      [selectedEdge, onEdgeUpdate]
    )

    const handleGroupUpdate = useCallback(
      (updates: Partial<TableGroup>) => {
        if (selectedGroup) {
          onGroupUpdate(selectedGroup.id, updates)
        }
      },
      [selectedGroup, onGroupUpdate]
    )

    return (
      <div className="w-full h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex flex-col shrink-0 overflow-hidden text-slate-700 dark:text-slate-200">
        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Properties</span>
        </div>

        <div className="flex-1 overflow-y-auto show-scrollbar">
          {selectedTable ? (
            <>
              <TableProperties
                table={selectedTable}
                onUpdate={handleTableUpdate}
                groups={groups}
                onAssign={onAssignTableToGroup}
              />
              <ColumnList
                columns={selectedTable.columns}
                onSelectColumn={setSelectedColumnId}
                selectedColumnId={selectedColumnId}
              />
              {selectedColumn && (
                <ColumnProperties column={selectedColumn} onUpdate={handleColumnUpdate} />
              )}
            </>
          ) : selectedEdge ? (
            <EdgeProperties edge={selectedEdge} onUpdate={handleEdgeUpdate} />
          ) : selectedGroup ? (
            <GroupProperties group={selectedGroup} onUpdate={handleGroupUpdate} />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    )
  }
)

PropertyPanel.displayName = 'PropertyPanel'

export default PropertyPanel
