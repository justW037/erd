/**
 * Sample Java entities
 * Use JavaDoc annotations: @pk, @unique, @notNull, @default, @ref
 * Or JPA annotations: @Id, @Column, @ManyToOne, etc.
 */

import javax.persistence.*;
import java.time.LocalDateTime;

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
    @Column(unique = true, nullable = false)
    private String username;

    /**
     * @unique
     * @notNull
     */
    private String email;

    /**
     * @notNull
     */
    private String passwordHash;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

public class Post {
    /**
     * @pk
     */
    @Id
    private Integer id;

    /**
     * @notNull
     */
    private String title;

    private String body;

    /**
     * @notNull
     * @ref User.id many-to-one
     */
    @ManyToOne
    private Integer authorId;

    /**
     * @default 'draft'
     */
    private String status; // draft, published, archived

    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
}

public class Comment {
    /**
     * @pk
     */
    @Id
    private Integer id;

    /**
     * @notNull
     * @ref Post.id many-to-one
     */
    @ManyToOne
    private Integer postId;

    /**
     * @notNull
     * @ref User.id many-to-one
     */
    @ManyToOne
    private Integer userId;

    /**
     * @notNull
     */
    private String content;

    private LocalDateTime createdAt;
}
