/**
 * Sample TypeScript entities
 * Use JSDoc annotations: @pk, @unique, @notNull, @default, @ref
 */

export interface User {
  /** @pk */
  id: number

  /** @unique @notNull */
  username: string

  /** @unique @notNull */
  email: string

  /** @notNull */
  passwordHash: string

  createdAt: Date
  updatedAt?: Date
}

export interface Post {
  /** @pk */
  id: number

  /** @notNull */
  title: string

  body?: string

  /**
   * @notNull
   * @ref User.id many-to-one
   */
  authorId: number

  /** @default 'draft' */
  status: 'draft' | 'published' | 'archived'

  publishedAt?: Date
  createdAt: Date
}

export interface Comment {
  /** @pk */
  id: number

  /**
   * @notNull
   * @ref Post.id many-to-one
   */
  postId: number

  /**
   * @notNull
   * @ref User.id many-to-one
   */
  userId: number

  /** @notNull */
  content: string

  createdAt: Date
}
