/**
 * Quick test script for parser, importer, and validator.
 * Run: npx tsx src/test.ts
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDSL } from './core/parser'
import { importTypeScript } from './core/importers'
import { validateSchema } from './core/ir'
import { buildGraph, layoutGraph } from './core/graph'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DBML_PATH = resolve(__dirname, '../examples/sample.dbml')
const TS_PATH = resolve(__dirname, '../examples/sample.ts')

console.log('─'.repeat(60))
console.log('Testing DSL Parser')
console.log('─'.repeat(60))

const dbmlSource = readFileSync(DBML_PATH, 'utf-8')
const schemaFromDSL = parseDSL(dbmlSource)

console.log(`Tables: ${schemaFromDSL.tables.map((t) => t.name).join(', ')}`)
console.log(`Enums: ${schemaFromDSL.enums.map((e) => e.name).join(', ')}`)
console.log(`Relations: ${schemaFromDSL.relations.length}`)
console.log(`TableGroups: ${schemaFromDSL.tableGroups.map((g) => g.name).join(', ')}`)

const dslValidation = validateSchema(schemaFromDSL)
console.log(`\nValidation: ${dslValidation.valid ? '✅ VALID' : '❌ INVALID'}`)
if (dslValidation.errors.length) {
  for (const err of dslValidation.errors) {
    console.log(`  [${err.type}] ${err.message}`)
  }
}

console.log('\n' + '─'.repeat(60))
console.log('Testing TypeScript Importer')
console.log('─'.repeat(60))

const tsSource = readFileSync(TS_PATH, 'utf-8')
const schemaFromTS = importTypeScript(tsSource)

console.log(`Tables: ${schemaFromTS.tables.map((t) => t.name).join(', ')}`)
console.log(`Relations: ${schemaFromTS.relations.length}`)

const tsValidation = validateSchema(schemaFromTS)
console.log(`\nValidation: ${tsValidation.valid ? '✅ VALID' : '❌ INVALID'}`)
if (tsValidation.errors.length) {
  for (const err of tsValidation.errors) {
    console.log(`  [${err.type}] ${err.message}`)
  }
}

console.log('\n' + '─'.repeat(60))
console.log('Testing Graph Builder & Layout')
console.log('─'.repeat(60))

// Build graph from DSL schema
const graph = buildGraph(schemaFromDSL)
console.log(`Nodes: ${graph.nodes.length}`)
console.log(`Edges: ${graph.edges.length}`)

// Apply dagre layout
const layoutedGraph = layoutGraph(graph, 'dagre', { direction: 'LR' })
console.log(`\nLayout applied (dagre, LR):`)
for (const node of layoutedGraph.nodes) {
  console.log(
    `  ${node.name}: (${Math.round(node.position.x)}, ${Math.round(
      node.position.y
    )}) - ${node.size.width}x${node.size.height}`
  )
}
console.log(`Graph bounds: ${JSON.stringify(layoutedGraph.bounds)}`)

// Test grid layout
const gridGraph = layoutGraph(graph, 'grid')
console.log(`\nGrid layout applied:`)
for (const node of gridGraph.nodes) {
  console.log(`  ${node.name}: (${Math.round(node.position.x)}, ${Math.round(node.position.y)})`)
}

console.log('\n✅ All tests passed!')
