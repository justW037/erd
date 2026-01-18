import { describe, it, expect } from 'vitest'
import { exportToSQL } from './export'
import type { DatabaseSchema } from '../core/ir/types'

describe('SQL Export', () => {
  it('should export simple table to PostgreSQL', () => {
    const schema: DatabaseSchema = {
      tables: [
        {
          name: 'users',
          columns: [
            {
              name: 'id',
              type: 'int',
              settings: { primaryKey: true, autoIncrement: true },
            },
            {
              name: 'name',
              type: 'varchar',
              settings: { notNull: true, length: 100 },
            },
          ],
          indexes: [],
        },
      ],
      relations: [],
      enums: [],
      tableGroups: [],
    }

    const sql = exportToSQL(schema, 'postgresql')
    expect(sql).toContain('CREATE TABLE "users"')
    expect(sql).toContain('"id" SERIAL') // SERIAL is implicitly NOT NULL
    expect(sql).toContain('"name" VARCHAR(100) NOT NULL')
    expect(sql).toContain('PRIMARY KEY ("id")')
  })

  it('should export foreign keys', () => {
    const schema: DatabaseSchema = {
      tables: [
        {
          name: 'users',
          columns: [{ name: 'id', type: 'int', settings: { primaryKey: true } }],
          indexes: [],
        },
        {
          name: 'posts',
          columns: [
            { name: 'id', type: 'int', settings: { primaryKey: true } },
            { name: 'user_id', type: 'int', settings: { notNull: true } },
          ],
          indexes: [],
        },
      ],
      relations: [
        {
          from: { table: 'posts', column: 'user_id' },
          to: { table: 'users', column: 'id' },
          type: 'many-to-one',
        },
      ],
      enums: [],
      tableGroups: [],
    }

    const sql = exportToSQL(schema, 'postgresql')
    expect(sql).toContain('ALTER TABLE "posts" ADD CONSTRAINT "fk_posts_user_id"')
    expect(sql).toContain('FOREIGN KEY ("user_id") REFERENCES "users"("id")')
  })

  it('should export indexes', () => {
    const schema: DatabaseSchema = {
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'int', settings: { primaryKey: true } },
            { name: 'email', type: 'varchar', settings: {} },
          ],
          indexes: [
            {
              name: 'idx_email',
              columns: ['email'],
              unique: true,
            },
          ],
        },
      ],
      relations: [],
      enums: [],
      tableGroups: [],
    }

    const sql = exportToSQL(schema, 'postgresql')
    expect(sql).toContain('CREATE UNIQUE INDEX "idx_email"')
    expect(sql).toContain('ON "users" ("email")')
  })

  it('should export enums for PostgreSQL', () => {
    const schema: DatabaseSchema = {
      tables: [
        {
          name: 'posts',
          columns: [
            { name: 'id', type: 'int', settings: { primaryKey: true } },
            { name: 'status', type: 'enum', rawType: 'post_status', settings: {} },
          ],
          indexes: [],
        },
      ],
      relations: [],
      enums: [
        {
          name: 'post_status',
          values: [{ name: 'draft' }, { name: 'published' }, { name: 'archived' }],
        },
      ],
      tableGroups: [],
    }

    const sql = exportToSQL(schema, 'postgresql')
    expect(sql).toContain('CREATE TYPE "post_status" AS ENUM')
    expect(sql).toContain("'draft', 'published', 'archived'")
  })

  it('should handle different SQL dialects', () => {
    const schema: DatabaseSchema = {
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'int', settings: { primaryKey: true, autoIncrement: true } },
          ],
          indexes: [],
        },
      ],
      relations: [],
      enums: [],
      tableGroups: [],
    }

    const pgSql = exportToSQL(schema, 'postgresql')
    expect(pgSql).toContain('SERIAL')

    const mysqlSql = exportToSQL(schema, 'mysql')
    expect(mysqlSql).toContain('AUTO_INCREMENT')
    expect(mysqlSql).toContain('`users`')

    const sqliteSql = exportToSQL(schema, 'sqlite')
    expect(sqliteSql).toContain('AUTOINCREMENT')
  })

  it('should export default values', () => {
    const schema: DatabaseSchema = {
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'int', settings: { primaryKey: true } },
            { name: 'active', type: 'boolean', settings: { default: true } },
            { name: 'role', type: 'varchar', settings: { default: 'user' } },
          ],
          indexes: [],
        },
      ],
      relations: [],
      enums: [],
      tableGroups: [],
    }

    const sql = exportToSQL(schema, 'postgresql')
    expect(sql).toContain('DEFAULT true')
    expect(sql).toContain("DEFAULT 'user'")
  })

  it('should handle composite primary keys', () => {
    const schema: DatabaseSchema = {
      tables: [
        {
          name: 'user_roles',
          columns: [
            { name: 'user_id', type: 'int', settings: { primaryKey: true } },
            { name: 'role_id', type: 'int', settings: { primaryKey: true } },
          ],
          indexes: [],
        },
      ],
      relations: [],
      enums: [],
      tableGroups: [],
    }

    const sql = exportToSQL(schema, 'postgresql')
    expect(sql).toContain('PRIMARY KEY ("user_id", "role_id")')
  })
})
