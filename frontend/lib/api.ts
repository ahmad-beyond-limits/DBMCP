import {
  AuditLog,
  ExtractedContent,
  FileRecord,
  MCPCredential,
  MCPCredentialCreated,
  User,
  Workspace,
  WorkspaceMember,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://dbmcp.onrender.com";

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

    const response = await fetch(`${API_BASE}${endpoint}`, {
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
  async register(username: string, password: string) {
    const data = await this.request<{ access_token: string; refresh_token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
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

  // Workspaces
  async getWorkspaces(): Promise<Workspace[]> {
    return this.request<Workspace[]>("/workspaces");
  }

  async createWorkspace(name: string): Promise<Workspace> {
    return this.request<Workspace>("/workspaces", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async getWorkspace(id: string): Promise<Workspace> {
    return this.request<Workspace>(`/workspaces/${id}`);
  }

  async updateWorkspace(id: string, data: { name?: string; is_active?: boolean }): Promise<Workspace> {
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

  async createMCPCredential(workspaceId: string, name: string, expiresInDays: number = 30): Promise<MCPCredentialCreated> {
    return this.request<MCPCredentialCreated>(`/workspaces/${workspaceId}/mcp-credentials`, {
      method: "POST",
      body: JSON.stringify({ name, expires_in_days: expiresInDays }),
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

  // Audit Logs
  async getAuditLogs(workspaceId: string, limit: number = 100): Promise<AuditLog[]> {
    return this.request<AuditLog[]>(`/workspaces/${workspaceId}/audit-logs?limit=${limit}`);
  }

  // MCP Gateway Tool Test Execution
  async executeMCPTool(token: string, method: string, params: any) {
    const res = await fetch(`${API_BASE}/mcp`, {
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
}

export const api = new ApiClient();
