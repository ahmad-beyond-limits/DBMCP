import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.database.session import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    first_name: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    workspaces = relationship("Workspace", back_populates="owner", cascade="all, delete-orphan")
    memberships = relationship("WorkspaceMember", back_populates="user", cascade="all, delete-orphan")


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    owner = relationship("User", back_populates="workspaces")
    members = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    files = relationship("FileRecord", back_populates="workspace", cascade="all, delete-orphan")
    resource_policies = relationship("ResourcePolicy", back_populates="workspace", cascade="all, delete-orphan")
    operation_policies = relationship("OperationPolicy", back_populates="workspace", cascade="all, delete-orphan")
    anonymisation_rules = relationship("AnonymisationRule", back_populates="workspace", cascade="all, delete-orphan")
    mcp_credentials = relationship("MCPCredential", back_populates="workspace", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="workspace", cascade="all, delete-orphan")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="MEMBER", nullable=False)  # OWNER, MEMBER
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="memberships")

    __table_args__ = (
        Index("ix_workspace_member_unique", "workspace_id", "user_id", unique=True),
    )


class FileRecord(Base):
    __tablename__ = "files"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    content_type: Mapped[str] = mapped_column(String(128), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    file_type: Mapped[str] = mapped_column(String(32), nullable=False)  # PDF, DOCX, TXT, CSV, JSON
    status: Mapped[str] = mapped_column(String(32), default="UPLOADING", index=True)  # UPLOADING, PROCESSING, READY, FAILED, DELETED
    uploaded_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    workspace = relationship("Workspace", back_populates="files")
    extracted_content = relationship("ExtractedContent", back_populates="file", uselist=False, cascade="all, delete-orphan")


class ExtractedContent(Base):
    __tablename__ = "extracted_content"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    file_id: Mapped[str] = mapped_column(String(36), ForeignKey("files.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False)
    plain_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    structured_data: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)  # parsed JSON or CSV row/column schemas
    detected_entities: Mapped[Optional[Any]] = mapped_column(JSON, default=list, nullable=True)  # [{type, value, start, end}]
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    file = relationship("FileRecord", back_populates="extracted_content")


class ResourcePolicy(Base):
    __tablename__ = "resource_policies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False)
    resource_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)  # Null = applies to all resources in workspace
    operation: Mapped[str] = mapped_column(String(64), default="read_resource", nullable=False)
    decision: Mapped[str] = mapped_column(String(32), default="ALLOW", nullable=False)  # ALLOW, DENY
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    workspace = relationship("Workspace", back_populates="resource_policies")


class OperationPolicy(Base):
    __tablename__ = "operation_policies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False)
    operation: Mapped[str] = mapped_column(String(64), nullable=False)  # list_resources, search, read_resource, query_dataset, etc.
    decision: Mapped[str] = mapped_column(String(32), default="ALLOW", nullable=False)  # ALLOW, DENY
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    workspace = relationship("Workspace", back_populates="operation_policies")

    __table_args__ = (
        Index("ix_workspace_operation_unique", "workspace_id", "operation", unique=True),
    )


class AnonymisationRule(Base):
    __tablename__ = "anonymisation_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)  # email, phone, ssn, person_name, or field name
    field_name: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # For CSV/JSON field-level policies
    transformation: Mapped[str] = mapped_column(String(32), default="MASK", nullable=False)  # ALLOW, REMOVE, REDACT, MASK, PSEUDONYMIZE, DENY
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    workspace = relationship("Workspace", back_populates="anonymisation_rules")


class MCPCredential(Base):
    __tablename__ = "mcp_credentials"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False)
    credential_prefix: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    secret_hash: Mapped[str] = mapped_column(String(255), nullable=False)  # HMAC-SHA256 hash
    name: Mapped[str] = mapped_column(String(128), default="Default MCP Key", nullable=False)
    permissions: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True, default=dict)  # {"can_read": True, "can_search": True, "can_query": True, "can_edit": False}
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    workspace = relationship("Workspace", back_populates="mcp_credentials")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False)
    actor_type: Mapped[str] = mapped_column(String(32), nullable=False)  # USER, MCP_CLIENT
    credential_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    operation: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    decision: Mapped[str] = mapped_column(String(32), nullable=False)  # ALLOW, DENY, ALLOW_WITH_TRANSFORMATION
    reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    policy_version: Mapped[int] = mapped_column(Integer, default=1)
    request_metadata: Mapped[Optional[Any]] = mapped_column(JSON, default=dict, nullable=True)  # sanitized parameters
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)

    workspace = relationship("Workspace", back_populates="audit_logs")
