export interface User {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  is_superuser?: boolean;
  is_active?: boolean;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  total_workspaces: number;
  total_files: number;
  total_credentials: number;
  total_audit_logs: number;
}

export interface AdminUser {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  is_superuser: boolean;
  is_active: boolean;
  created_at: string;
  workspaces_count: number;
  files_count: number;
}

export interface AdminWorkspace {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  owner_username: string;
  created_at: string;
  files_count: number;
  credentials_count: number;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  is_active: boolean;
  role: "OWNER" | "MEMBER";
  files_count: number;
  policies_count: number;
  credentials_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  username?: string;
  role: "OWNER" | "MEMBER";
  created_at: string;
}

export interface FileRecord {
  id: string;
  workspace_id: string;
  original_filename: string;
  content_type: string;
  file_size: number;
  file_type: "PDF" | "DOCX" | "TXT" | "CSV" | "JSON";
  status: "UPLOADING" | "PROCESSING" | "READY" | "FAILED" | "DELETED";
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ExtractedContent {
  id: string;
  file_id: string;
  workspace_id: string;
  plain_text: string;
  structured_data?: any;
  detected_entities?: Array<{
    entity_type: string;
    value: string;
    start: number;
    end: number;
  }>;
  summary?: string;
  created_at: string;
}

export interface ResourcePolicy {
  id: string;
  workspace_id: string;
  resource_id?: string | null;
  operation: string;
  decision: "ALLOW" | "DENY";
  created_at: string;
}

export interface OperationPolicy {
  id: string;
  workspace_id: string;
  operation: string;
  decision: "ALLOW" | "DENY";
  created_at: string;
}

export interface AnonymisationRule {
  id: string;
  workspace_id: string;
  entity_type: string;
  field_name?: string | null;
  transformation: "ALLOW" | "REMOVE" | "REDACT" | "MASK" | "PSEUDONYMIZE" | "DENY";
  created_at: string;
}

export interface MCPCredential {
  id: string;
  workspace_id: string;
  name: string;
  credential_prefix: string;
  created_at: string;
  expires_at?: string | null;
  revoked_at?: string | null;
  last_used_at?: string | null;
  is_active: boolean;
  permissions?: {
    read_resource?: boolean;
    search?: boolean;
    query_dataset?: boolean;
    edit_dataset?: boolean;
    [key: string]: any;
  };
}

export interface MCPCredentialCreated extends MCPCredential {
  raw_token: string;
  warning: string;
}

export interface AuditLog {
  id: string;
  workspace_id: string;
  actor_type: "USER" | "MCP_CLIENT" | "SYSTEM";
  credential_id?: string | null;
  user_id?: string | null;
  operation: string;
  resource_type?: string | null;
  resource_id?: string | null;
  decision: "ALLOW" | "DENY" | "ALLOW_WITH_TRANSFORMATION";
  reason?: string | null;
  policy_version: number;
  request_metadata?: any;
  timestamp: string;
}
