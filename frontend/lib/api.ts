import {
  AccountMCPActivity,
  AccountMCPCredential,
  AccountMCPCredentialCreated,
  AccountMCPPermissions,
  AdminStats,
  AdminUser,
  AdminWorkspace,
  AuditLog,
  ExtractedContent,
  FileRecord,
  MCPCredential,
  MCPCredentialCreated,
  User,
  Workspace,
  WorkspaceMember,
} from "./types";

export function getApiBase(): string {
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:8000";
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "https://dbmcp.onrender.com";
}

class ApiClient {
  private getHeaders(contentType: string | null = "application/json"): HeadersInit {
    const headers: Record<string, string> = {};
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("dbmcp_access_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const isFormData = options.body instanceof FormData;
    const defaultHeaders = this.getHeaders(isFormData ? null : "application/json");
    const apiBase = getApiBase();

    const response = await fetch(`${apiBase}${endpoint}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    });

    if (response.status === 401 && typeof window !== "undefined") {
      // Token might be expired
      if (!endpoint.startsWith("/auth/")) {
        localStorage.removeItem("dbmcp_access_token");
        window.location.href = "/login";
      }
    }

    if (!response.ok) {
      let errorMsg = `Request failed (${response.status})`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.detail || errorData.message || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // Auth
  async register(username: string, password: string, first_name?: string, last_name?: string) {
    const data = await this.request<{ access_token: string; refresh_token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password, first_name, last_name }),
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("dbmcp_access_token", data.access_token);
      localStorage.setItem("dbmcp_refresh_token", data.refresh_token);
    }
    return data;
  }

  async login(username: string, password: string) {
    const data = await this.request<{ access_token: string; refresh_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("dbmcp_access_token", data.access_token);
      localStorage.setItem("dbmcp_refresh_token", data.refresh_token);
    }
    return data;
  }

  getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dbmcp_access_token");
    }
    return null;
  }

  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("dbmcp_access_token");
      localStorage.removeItem("dbmcp_refresh_token");
      window.location.href = "/login";
    }
  }

  async getMe(): Promise<User> {
    return this.request<User>("/auth/me");
  }

  async updateMe(data: { first_name?: string; last_name?: string }): Promise<User> {
    return this.request<User>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async changePassword(current_password: string, new_password: string): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    });
  }

  async deleteAccount(password: string): Promise<{ status: string; message: string }> {
    const res = await this.request<{ status: string; message: string }>("/auth/delete-account", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    if (typeof window !== "undefined") {
      localStorage.removeItem("dbmcp_access_token");
      localStorage.removeItem("dbmcp_refresh_token");
    }
    return res;
  }

  // Workspaces
  async getWorkspaces(): Promise<Workspace[]> {
    return this.request<Workspace[]>("/workspaces");
  }

  async createWorkspace(name: string, description?: string): Promise<Workspace> {
    return this.request<Workspace>("/workspaces", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
  }

  async getWorkspace(id: string): Promise<Workspace> {
    return this.request<Workspace>(`/workspaces/${id}`);
  }

  async updateWorkspace(id: string, data: { name?: string; description?: string; is_active?: boolean }): Promise<Workspace> {
    return this.request<Workspace>(`/workspaces/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteWorkspace(id: string): Promise<void> {
    return this.request<void>(`/workspaces/${id}`, { method: "DELETE" });
  }

  // Members
  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return this.request<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`);
  }

  async addMember(workspaceId: string, username: string, role: string): Promise<WorkspaceMember> {
    return this.request<WorkspaceMember>(`/workspaces/${workspaceId}/members`, {
      method: "POST",
      body: JSON.stringify({ username, role }),
    });
  }

  async removeMember(workspaceId: string, memberId: string): Promise<void> {
    return this.request<void>(`/workspaces/${workspaceId}/members/${memberId}`, {
      method: "DELETE",
    });
  }

  // Files
  async getFiles(workspaceId: string): Promise<FileRecord[]> {
    return this.request<FileRecord[]>(`/workspaces/${workspaceId}/files`);
  }

  async uploadFile(workspaceId: string, file: File): Promise<FileRecord> {
    const formData = new FormData();
    formData.append("file", file);
    return this.request<FileRecord>(`/workspaces/${workspaceId}/files`, {
      method: "POST",
      body: formData,
    });
  }

  async importCloudLink(workspaceId: string, url: string, customName?: string): Promise<FileRecord> {
    return this.request<FileRecord>(`/workspaces/${workspaceId}/files/import-link`, {
      method: "POST",
      body: JSON.stringify({ url, custom_name: customName || null }),
    });
  }

  async getFileContent(workspaceId: string, fileId: string): Promise<ExtractedContent> {
    return this.request<ExtractedContent>(`/workspaces/${workspaceId}/files/${fileId}/content`);
  }

  async deleteFile(workspaceId: string, fileId: string): Promise<void> {
    return this.request<void>(`/workspaces/${workspaceId}/files/${fileId}`, {
      method: "DELETE",
    });
  }

  // Policies
  async getPolicies(workspaceId: string) {
    return this.request<{
      resource_policies: any[];
      operation_policies: any[];
      anonymisation_rules: any[];
    }>(`/workspaces/${workspaceId}/policies`);
  }

  async createResourcePolicy(workspaceId: string, resourceId: string | null, operation: string, decision: string) {
    return this.request(`/workspaces/${workspaceId}/policies/resource`, {
      method: "POST",
      body: JSON.stringify({ resource_id: resourceId, operation, decision }),
    });
  }

  async deleteResourcePolicy(workspaceId: string, policyId: string) {
    return this.request(`/workspaces/${workspaceId}/policies/resource/${policyId}`, {
      method: "DELETE",
    });
  }

  async createOperationPolicy(workspaceId: string, operation: string, decision: string) {
    return this.request(`/workspaces/${workspaceId}/policies/operation`, {
      method: "POST",
      body: JSON.stringify({ operation, decision }),
    });
  }

  async deleteOperationPolicy(workspaceId: string, policyId: string) {
    return this.request(`/workspaces/${workspaceId}/policies/operation/${policyId}`, {
      method: "DELETE",
    });
  }

  async createAnonymisationRule(workspaceId: string, entityType: string, fieldName: string | null, transformation: string) {
    return this.request(`/workspaces/${workspaceId}/policies/anonymisation`, {
      method: "POST",
      body: JSON.stringify({ entity_type: entityType, field_name: fieldName, transformation }),
    });
  }

  async deleteAnonymisationRule(workspaceId: string, ruleId: string) {
    return this.request(`/workspaces/${workspaceId}/policies/anonymisation/${ruleId}`, {
      method: "DELETE",
    });
  }

  // MCP Credentials
  async getMCPCredentials(workspaceId: string): Promise<MCPCredential[]> {
    return this.request<MCPCredential[]>(`/workspaces/${workspaceId}/mcp-credentials`);
  }

  async createMCPCredential(
    workspaceId: string,
    name: string,
    expiresInDays: number = 30,
    permissions?: Record<string, any>
  ): Promise<MCPCredentialCreated> {
    return this.request<MCPCredentialCreated>(`/workspaces/${workspaceId}/mcp-credentials`, {
      method: "POST",
      body: JSON.stringify({ name, expires_in_days: expiresInDays, permissions }),
    });
  }

  async updateMCPCredential(
    workspaceId: string,
    credId: string,
    data: { name?: string; permissions?: Record<string, any> }
  ): Promise<MCPCredential> {
    return this.request<MCPCredential>(`/workspaces/${workspaceId}/mcp-credentials/${credId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async rotateMCPCredential(workspaceId: string, credId: string): Promise<MCPCredentialCreated> {
    return this.request<MCPCredentialCreated>(`/workspaces/${workspaceId}/mcp-credentials/${credId}/rotate`, {
      method: "POST",
    });
  }

  async revokeMCPCredential(workspaceId: string, credId: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/workspaces/${workspaceId}/mcp-credentials/${credId}/revoke`, {
      method: "POST",
    });
  }

  async deleteMCPCredential(workspaceId: string, credId: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/workspaces/${workspaceId}/mcp-credentials/${credId}`, {
      method: "DELETE",
    });
  }

  // Audit Logs
  async getAuditLogs(workspaceId: string, limit: number = 100): Promise<AuditLog[]> {
    return this.request<AuditLog[]>(`/workspaces/${workspaceId}/audit-logs?limit=${limit}`);
  }

  // MCP Gateway Tool Test Execution
  async executeMCPTool(token: string, method: string, params: any) {
    const res = await fetch(`${getApiBase()}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.trim()}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Network error" }));
      throw new Error(err.detail || `MCP request failed with ${res.status}`);
    }
    return res.json();
  }

  // Master Admin API Methods
  async getAdminStats(): Promise<AdminStats> {
    return this.request<AdminStats>("/admin/stats");
  }

  async getAdminUsers(): Promise<AdminUser[]> {
    return this.request<AdminUser[]>("/admin/users");
  }

  async updateAdminUserStatus(userId: string, data: { is_active?: boolean; is_superuser?: boolean }) {
    return this.request<{ status: string; message: string; is_active: boolean; is_superuser: boolean }>(
      `/admin/users/${userId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  }

  async adminResetPassword(userId: string, new_password: string) {
    return this.request<{ status: string; message: string }>(`/admin/users/${userId}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ new_password }),
    });
  }

  async adminImpersonateUser(userId: string) {
    const data = await this.request<{ status: string; access_token: string; target_username: string; target_user_id: string }>(
      `/admin/users/${userId}/impersonate`,
      {
        method: "POST",
      }
    );
    if (typeof window !== "undefined") {
      const currentAdminToken = localStorage.getItem("dbmcp_access_token");
      if (currentAdminToken) {
        sessionStorage.setItem("admin_impersonate_backup", currentAdminToken);
        sessionStorage.setItem("admin_impersonate_target", data.target_username);
      }
      localStorage.setItem("dbmcp_access_token", data.access_token);
    }
    return data;
  }

  async exitImpersonation() {
    if (typeof window !== "undefined") {
      const backupToken = sessionStorage.getItem("admin_impersonate_backup");
      if (backupToken) {
        localStorage.setItem("dbmcp_access_token", backupToken);
        sessionStorage.removeItem("admin_impersonate_backup");
        sessionStorage.removeItem("admin_impersonate_target");
        window.location.href = "/admin";
      }
    }
  }

  async adminDeleteUser(userId: string) {
    return this.request<{ status: string; message: string }>(`/admin/users/${userId}`, {
      method: "DELETE",
    });
  }

  async getAdminWorkspaces(): Promise<AdminWorkspace[]> {
    return this.request<AdminWorkspace[]>("/admin/workspaces");
  }

  // Account-Level Master MCP Management
  async getAccountMCPCredentials(): Promise<AccountMCPCredential[]> {
    return this.request<AccountMCPCredential[]>("/account/mcp-credentials");
  }

  async createAccountMCPCredential(data: {
    name: string;
    permissions?: Partial<AccountMCPPermissions>;
    expires_in_days?: number | null;
  }): Promise<AccountMCPCredentialCreated> {
    return this.request<AccountMCPCredentialCreated>("/account/mcp-credentials", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async rotateAccountMCPCredential(credentialId: string): Promise<AccountMCPCredentialCreated> {
    return this.request<AccountMCPCredentialCreated>(`/account/mcp-credentials/${credentialId}/rotate`, {
      method: "POST",
    });
  }

  async revokeAccountMCPCredential(credentialId: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/account/mcp-credentials/${credentialId}`, {
      method: "DELETE",
    });
  }

  async deleteAccountMCPCredential(credentialId: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/account/mcp-credentials/${credentialId}?permanent=true`, {
      method: "DELETE",
    });
  }

  async getAccountMCPActivity(limit: number = 50): Promise<AccountMCPActivity[]> {
    return this.request<AccountMCPActivity[]>(`/account/mcp-activity?limit=${limit}`);
  }
}

export const api = new ApiClient();
