/**
 * Sample C# entities
 * Use XML doc comments: <pk />, <unique />, <notNull />, <default>, <ref>
 * Or Entity Framework annotations: [Key], [Required], [ForeignKey]
 */

using System;
using System.ComponentModel.DataAnnotations;

public class User
{
    /// <pk />
    [Key]
    public int Id { get; set; }

    /// <unique />
    /// <notNull />
    [Required]
    public string Username { get; set; }

    /// <unique />
    /// <notNull />
    [Required]
    public string Email { get; set; }

    /// <notNull />
    [Required]
    public string PasswordHash { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class Post
{
    /// <pk />
    [Key]
    public int Id { get; set; }

    /// <notNull />
    [Required]
    public string Title { get; set; }

    public string? Body { get; set; }

    /// <ref table="User" column="Id" type="many-to-one" />
    [Required]
    public int AuthorId { get; set; }

    /// <default>draft</default>
    public string Status { get; set; } = "draft"; // draft, published, archived

    public DateTime? PublishedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class Comment
{
    /// <pk />
    [Key]
    public int Id { get; set; }

    /// <ref table="Post" column="Id" type="many-to-one" />
    [Required]
    public int PostId { get; set; }

    /// <ref table="User" column="Id" type="many-to-one" />
    [Required]
    public int UserId { get; set; }

    /// <notNull />
    [Required]
    public string Content { get; set; }

    public DateTime CreatedAt { get; set; }
}
