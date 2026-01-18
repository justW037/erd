"""
Sample Python entities
Use comment annotations: # @pk, # @unique, # @notNull, # @default, # @ref
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class User:
    id: int  # @pk
    username: str  # @unique @notNull
    email: str  # @unique @notNull
    password_hash: str  # @notNull
    created_at: datetime
    updated_at: Optional[datetime] = None

@dataclass
class Post:
    id: int  # @pk
    title: str  # @notNull
    body: Optional[str] = None
    author_id: int  # @notNull @ref User.id many-to-one
    status: str = 'draft'  # @default draft
    published_at: Optional[datetime] = None
    created_at: datetime = None

@dataclass
class Comment:
    id: int  # @pk
    post_id: int  # @notNull @ref Post.id many-to-one
    user_id: int  # @notNull @ref User.id many-to-one
    content: str  # @notNull
    created_at: datetime = None
