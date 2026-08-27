"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  AuditLog,
  ExtractedContent,
  FileRecord,
  MCPCredential,
  MCPCredentialCreated,
  Workspace,
  WorkspaceMember,
} from "@/lib/types";

export default function WorkspaceDetailPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const router = useRouter();

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "files" | "policies" | "anonymisation" | "mcp" | "audit" | "playground" | "settings"
  >("overview");

  // State
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [policies, setPolicies] = useState<{
    resource_policies: any[];
    operation_policies: any[];
    anonymisation_rules: any[];
  }>({ resource_policies: [], operation_policies: [], anonymisation_rules: [] });
  const [mcpCredentials, setMCPCredentials] = useState<MCPCredential[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals & Action States
  const [selectedFileContent, setSelectedFileContent] = useState<ExtractedContent | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [newMCPModal, setNewMCPModal] = useState(false);
  const [newMCPName, setNewMCPName] = useState("Claude Assistant");
  const [createdCredential, setCreatedCredential] = useState<MCPCredentialCreated | null>(null);
  const [newMemberUsername, setNewMemberUsername] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("MEMBER");

  // Policy Creation States
  const [newResourceFileId, setNewResourceFileId] = useState<string>("default");
  const [newResourceDecision, setNewResourceDecision] = useState<string>("DENY");
  const [newOpName, setNewOpName] = useState<string>("query_dataset");
  const [newOpDecision, setNewOpDecision] = useState<string>("ALLOW");
  const [newAnonEntity, setNewAnonEntity] = useState<string>("email");
  const [newAnonFieldName, setNewAnonFieldName] = useState<string>("");
  const [newAnonTrans, setNewAnonTrans] = useState<string>("MASK");

  // Playground States
  const [playgroundToken, setPlaygroundToken] = useState("");
  const [playgroundTool, setPlaygroundTool] = useState("workspace_info");
  const [playgroundArgs, setPlaygroundArgs] = useState("{}");
  const [playgroundResult, setPlaygroundResult] = useState<any>(null);
  const [playgroundLoading, setPlaygroundLoading] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      loadWorkspaceData();
    }
  }, [workspaceId]);

  const loadWorkspaceData = async () => {
    try {
      setLoading(true);
      const [ws, fList, pols, creds, logs, mems] = await Promise.all([
        api.getWorkspace(workspaceId),
        api.getFiles(workspaceId),
        api.getPolicies(workspaceId),
        api.getMCPCredentials(workspaceId),
        api.getAuditLogs(workspaceId, 100),
        api.getMembers(workspaceId),
      ]);
      setWorkspace(ws);
      setFiles(fList);
      setPolicies(pols);
      setMCPCredentials(creds);
      setAuditLogs(logs);
      setMembers(mems);
    } catch (err: any) {
      notify("error", err.message || "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  };

  const notify = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 5000);
  };

  // --- Handlers ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    try {
      const file = fileList[0];
      await api.uploadFile(workspaceId, file);
      notify("success", `File '${file.name}' uploaded and processed successfully!`);
      const updatedFiles = await api.getFiles(workspaceId);
      setFiles(updatedFiles);
    } catch (err: any) {
      notify("error", err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleViewContent = async (file: FileRecord) => {
    try {
      setSelectedFileName(file.original_filename);
      const content = await api.getFileContent(workspaceId, file.id);
      setSelectedFileContent(content);
    } catch (err: any) {
      notify("error", err.message || "Failed to read content");
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file? This will remove all extracted content.")) return;
    try {
      await api.deleteFile(workspaceId, fileId);
      notify("success", "File removed");
      setFiles(files.filter((f) => f.id !== fileId));
    } catch (err: any) {
      notify("error", err.message || "Failed to delete file");
    }
  };

  const handleCreateResourcePolicy = async () => {
    try {
      const resourceId = newResourceFileId === "default" ? null : newResourceFileId;
      await api.createResourcePolicy(workspaceId, resourceId, "read_resource", newResourceDecision);
      notify("success", "Resource policy saved");
      const updated = await api.getPolicies(workspaceId);
      setPolicies(updated);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleDeleteResourcePolicy = async (policyId: string) => {
    try {
      await api.deleteResourcePolicy(workspaceId, policyId);
      notify("success", "Policy deleted");
      const updated = await api.getPolicies(workspaceId);
      setPolicies(updated);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleCreateOperationPolicy = async () => {
    try {
      await api.createOperationPolicy(workspaceId, newOpName, newOpDecision);
      notify("success", "Operation policy updated");
      const updated = await api.getPolicies(workspaceId);
      setPolicies(updated);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleDeleteOperationPolicy = async (policyId: string) => {
    try {
      await api.deleteOperationPolicy(workspaceId, policyId);
      notify("success", "Operation policy deleted");
      const updated = await api.getPolicies(workspaceId);
      setPolicies(updated);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleCreateAnonymisationRule = async () => {
    try {
      await api.createAnonymisationRule(
        workspaceId,
        newAnonEntity,
        newAnonFieldName.trim() || null,
        newAnonTrans
      );
      notify("success", "Anonymisation rule saved");
      const updated = await api.getPolicies(workspaceId);
      setPolicies(updated);
      setNewAnonFieldName("");
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleDeleteAnonymisationRule = async (ruleId: string) => {
    try {
      await api.deleteAnonymisationRule(workspaceId, ruleId);
      notify("success", "Rule deleted");
      const updated = await api.getPolicies(workspaceId);
      setPolicies(updated);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleCreateMCPCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createMCPCredential(workspaceId, newMCPName.trim());
      setCreatedCredential(created);
      setNewMCPModal(false);
      const updatedCreds = await api.getMCPCredentials(workspaceId);
      setMCPCredentials(updatedCreds);
      notify("success", "High-entropy MCP credential generated!");
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleRotateMCP = async (credId: string) => {
    if (!confirm("Rotating will immediately invalidate the existing token. Continue?")) return;
    try {
      const rotated = await api.rotateMCPCredential(workspaceId, credId);
      setCreatedCredential(rotated);
      const updatedCreds = await api.getMCPCredentials(workspaceId);
      setMCPCredentials(updatedCreds);
      notify("success", "Credential rotated successfully!");
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleRevokeMCP = async (credId: string) => {
    if (!confirm("Revoking will immediately deny all MCP requests using this token. Continue?")) return;
    try {
      await api.revokeMCPCredential(workspaceId, credId);
      notify("success", "Credential revoked");
      const updatedCreds = await api.getMCPCredentials(workspaceId);
      setMCPCredentials(updatedCreds);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberUsername.trim()) return;
    try {
      await api.addMember(workspaceId, newMemberUsername.trim(), newMemberRole);
      notify("success", `User '${newMemberUsername}' added as ${newMemberRole}`);
      setNewMemberUsername("");
      const updatedMembers = await api.getMembers(workspaceId);
      setMembers(updatedMembers);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Remove this member from the workspace?")) return;
    try {
      await api.removeMember(workspaceId, memberId);
      notify("success", "Member removed");
      setMembers(members.filter((m) => m.id !== memberId));
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleDeleteWorkspace = async () => {
    const confirmName = prompt(`Type the workspace name "${workspace?.name}" to confirm permanent deletion:`);
    if (confirmName !== workspace?.name) {
      alert("Name does not match. Deletion cancelled.");
      return;
    }
    try {
      await api.deleteWorkspace(workspaceId);
      router.push("/dashboard");
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleExecutePlayground = async () => {
    if (!playgroundToken.trim()) {
      notify("error", "Please provide a valid MCP token (mcp_live_...)");
      return;
    }
    setPlaygroundLoading(true);
    setPlaygroundResult(null);
    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(playgroundArgs);
      } catch {
        throw new Error("Invalid JSON arguments");
      }

      let res;
      if (playgroundTool === "tools/list" || playgroundTool === "initialize") {
        res = await api.executeMCPTool(playgroundToken, playgroundTool, {});
      } else {
        res = await api.executeMCPTool(playgroundToken, "tools/call", {
          name: playgroundTool,
          arguments: parsedArgs,
        });
      }
      setPlaygroundResult(res);
      // Refresh audit logs after playground call
      const updatedLogs = await api.getAuditLogs(workspaceId, 50);
      setAuditLogs(updatedLogs);
    } catch (err: any) {
      setPlaygroundResult({ error: err.message });
      notify("error", err.message);
    } finally {
      setPlaygroundLoading(false);
    }
  };

  if (loading || !workspace) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div style={{ color: "var(--text-secondary)" }}>Loading workspace security boundary...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1300px", margin: "0 auto", padding: "2rem" }}>
      {/* Notifications Toast */}
      {notification && (
        <div style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          zIndex: 200,
          background: notification.type === "success" ? "var(--status-allow-bg)" : "var(--status-deny-bg)",
          border: `1px solid ${notification.type === "success" ? "rgba(16, 185, 129, 0.4)" : "rgba(244, 63, 94, 0.4)"}`,
          color: notification.type === "success" ? "var(--status-allow)" : "var(--status-deny)",
          padding: "0.85rem 1.25rem",
          borderRadius: "var(--radius-md)",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
          fontWeight: 600,
          fontSize: "0.9rem",
        }}>
          {notification.text}
        </div>
      )}

      {/* Header Breadcrumb & Status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/dashboard" style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            ← Workspaces
          </Link>
          <span style={{ color: "var(--border-card)" }}>/</span>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            {workspace.name}
          </h1>
          <span className={`badge ${workspace.is_active ? "badge-allow" : "badge-deny"}`}>
            {workspace.is_active ? "Active" : "Inactive"}
          </span>
          <span className="badge badge-neutral">{workspace.role}</span>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={() => setNewMCPModal(true)} className="btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            🔑 Generate MCP Key
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{
        display: "flex",
        gap: "0.5rem",
        borderBottom: "1px solid var(--border-subtle)",
        marginBottom: "2rem",
        overflowX: "auto",
        paddingBottom: "0.25rem",
      }}>
        {[
          { id: "overview", label: "Overview", icon: "📊" },
          { id: "files", label: `Files (${files.length})`, icon: "📁" },
          { id: "policies", label: "Policies", icon: "🛡️" },
          { id: "anonymisation", label: "Anonymisation", icon: "🎭" },
          { id: "mcp", label: `MCP Access (${mcpCredentials.length})`, icon: "⚡" },
          { id: "audit", label: `Audit Logs (${auditLogs.length})`, icon: "📜" },
          { id: "playground", label: "Playground", icon: "🧪" },
          { id: "settings", label: "Settings", icon: "⚙️" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: "0.65rem 1.15rem",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.9rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: activeTab === tab.id ? "rgba(99, 102, 241, 0.15)" : "transparent",
              color: activeTab === tab.id ? "#fff" : "var(--text-secondary)",
              borderBottom: activeTab === tab.id ? "2px solid var(--accent-primary)" : "2px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div>
          {/* Quick Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            <div className="glass-card">
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Files in Vault</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, marginTop: "0.25rem" }}>{files.length}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Extracted & isolated</div>
            </div>

            <div className="glass-card">
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Resource Rules</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "#818cf8", marginTop: "0.25rem" }}>
                {policies.resource_policies.length}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Per-resource access gates</div>
            </div>

            <div className="glass-card">
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Anonymisation Rules</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "#f59e0b", marginTop: "0.25rem" }}>
                {policies.anonymisation_rules.length}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Active field/entity transforms</div>
            </div>

            <div className="glass-card">
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Active MCP Keys</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "#34d399", marginTop: "0.25rem" }}>
                {mcpCredentials.filter((c) => c.is_active).length}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>High-entropy credentials</div>
            </div>
          </div>

          {/* Security Principle Callout */}
          <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.75rem" }}>
              🛡️ Workspace Security Boundary Invariant
            </h3>
            <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1rem" }}>
              Every request arriving through the Model Context Protocol (MCP) is mapped exclusively to this workspace ID.
              The AI model never receives direct database or storage credentials. Every tool call is authenticated, evaluated
              against your explicit policies, passed through the anonymisation engine, and logged.
            </p>
            <div className="code-box">
              AI Model → MCP Gateway → Token Auth → Workspace Resolution ({workspace.id}) → Policy Engine → Anonymisation Engine → Output
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FILES */}
      {/* ========================================================================= */}
      {activeTab === "files" && (
        <div>
          {/* Upload Area */}
          <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📤</div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Upload Workspace Document or Dataset
            </h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Supported formats: PDF, DOCX, TXT, CSV, JSON (up to 50MB). Files are processed and scanned for PII immediately upon upload.
            </p>

            <label className="btn-primary" style={{ cursor: "pointer" }}>
              {uploading ? "Extracting & Storing..." : "Choose File to Upload"}
              <input
                type="file"
                disabled={uploading}
                onChange={handleFileUpload}
                accept=".pdf,.docx,.txt,.csv,.json"
                style={{ display: "none" }}
              />
            </label>
          </div>

          {/* Files Table */}
          <div className="glass-panel" style={{ overflow: "hidden" }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                      No files uploaded to this workspace yet.
                    </td>
                  </tr>
                ) : (
                  files.map((file) => (
                    <tr key={file.id}>
                      <td style={{ fontWeight: 600 }}>{file.original_filename}</td>
                      <td>
                        <span className="badge badge-neutral">{file.file_type}</span>
                      </td>
                      <td>{(file.file_size / 1024).toFixed(1)} KB</td>
                      <td>
                        <span className={`badge ${file.status === "READY" ? "badge-allow" : file.status === "FAILED" ? "badge-deny" : "badge-transform"}`}>
                          {file.status}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>
                        {new Date(file.created_at).toLocaleString()}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => handleViewContent(file)}
                            className="btn-secondary"
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
                          >
                            View Extracted
                          </button>
                          {workspace.role === "OWNER" && (
                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              className="btn-danger"
                              style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: POLICIES */}
      {/* ========================================================================= */}
      {activeTab === "policies" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          {/* Resource Access Policies */}
          <div className="glass-panel" style={{ padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Resource Access Policies
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Control read permissions on individual files or set workspace-wide defaults. Explicit DENY overrides ALLOW.
            </p>

            {workspace.role === "OWNER" && (
              <div style={{ background: "rgba(10, 14, 23, 0.6)", padding: "1rem", borderRadius: "var(--radius-md)", marginBottom: "1.5rem" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.75rem" }}>Add Resource Policy</div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <select
                    className="form-input"
                    style={{ flex: 1, minWidth: "160px" }}
                    value={newResourceFileId}
                    onChange={(e) => setNewResourceFileId(e.target.value)}
                  >
                    <option value="default">Workspace Default (All Files)</option>
                    {files.map((f) => (
                      <option key={f.id} value={f.id}>File: {f.original_filename}</option>
                    ))}
                  </select>

                  <select
                    className="form-input"
                    style={{ width: "110px" }}
                    value={newResourceDecision}
                    onChange={(e) => setNewResourceDecision(e.target.value)}
                  >
                    <option value="ALLOW">ALLOW</option>
                    <option value="DENY">DENY</option>
                  </select>

                  <button onClick={handleCreateResourcePolicy} className="btn-primary" style={{ padding: "0.5rem 1rem" }}>
                    Save
                  </button>
                </div>
              </div>
            )}

            <div>
              {policies.resource_policies.length === 0 ? (
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                  No custom resource policies configured. Default workspace rules apply.
                </div>
              ) : (
                policies.resource_policies.map((p) => {
                  const targetFile = files.find((f) => f.id === p.resource_id);
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.75rem",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                          {targetFile ? targetFile.original_filename : "All Resources (Workspace Default)"}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Operation: {p.operation}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span className={`badge ${p.decision === "ALLOW" ? "badge-allow" : "badge-deny"}`}>
                          {p.decision}
                        </span>
                        {workspace.role === "OWNER" && (
                          <button
                            onClick={() => handleDeleteResourcePolicy(p.id)}
                            style={{ color: "var(--status-deny)", fontSize: "0.8rem" }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Operation Permissions */}
          <div className="glass-panel" style={{ padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Operation Policies
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Control which MCP operations can be executed by connected models.
            </p>

            {workspace.role === "OWNER" && (
              <div style={{ background: "rgba(10, 14, 23, 0.6)", padding: "1rem", borderRadius: "var(--radius-md)", marginBottom: "1.5rem" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.75rem" }}>Configure Operation</div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <select
                    className="form-input"
                    style={{ flex: 1 }}
                    value={newOpName}
                    onChange={(e) => setNewOpName(e.target.value)}
                  >
                    <option value="workspace_info">workspace_info</option>
                    <option value="list_resources">list_resources</option>
                    <option value="get_resource_metadata">get_resource_metadata</option>
                    <option value="search">search</option>
                    <option value="read_resource">read_resource</option>
                    <option value="get_dataset_schema">get_dataset_schema</option>
                    <option value="query_dataset">query_dataset</option>
                  </select>

                  <select
                    className="form-input"
                    style={{ width: "110px" }}
                    value={newOpDecision}
                    onChange={(e) => setNewOpDecision(e.target.value)}
                  >
                    <option value="ALLOW">ALLOW</option>
                    <option value="DENY">DENY</option>
                  </select>

                  <button onClick={handleCreateOperationPolicy} className="btn-primary" style={{ padding: "0.5rem 1rem" }}>
                    Save
                  </button>
                </div>
              </div>
            )}

            <div>
              {policies.operation_policies.length === 0 ? (
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                  Standard read operations allowed by default.
                </div>
              ) : (
                policies.operation_policies.map((op) => (
                  <div
                    key={op.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.9rem", fontWeight: 600 }}>
                      {op.operation}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span className={`badge ${op.decision === "ALLOW" ? "badge-allow" : "badge-deny"}`}>
                        {op.decision}
                      </span>
                      {workspace.role === "OWNER" && (
                        <button
                          onClick={() => handleDeleteOperationPolicy(op.id)}
                          style={{ color: "var(--status-deny)", fontSize: "0.8rem" }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ANONYMISATION */}
      {/* ========================================================================= */}
      {activeTab === "anonymisation" && (
        <div>
          <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Configure Entity & Field Transformation Rules
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Define how PII entities or specific CSV/JSON columns are transformed at read time. Original documents remain intact.
            </p>

            {workspace.role === "OWNER" && (
              <div style={{ background: "rgba(10, 14, 23, 0.6)", padding: "1.25rem", borderRadius: "var(--radius-md)", marginBottom: "2rem" }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.75rem" }}>New Anonymisation Rule</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0.75rem", alignItems: "center" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                      Entity Type / Category
                    </label>
                    <select
                      className="form-input"
                      value={newAnonEntity}
                      onChange={(e) => setNewAnonEntity(e.target.value)}
                    >
                      <option value="email">Email Address</option>
                      <option value="phone">Phone Number</option>
                      <option value="ssn">Social Security Number (SSN)</option>
                      <option value="person_name">Person Name</option>
                      <option value="credit_card">Credit Card Number</option>
                      <option value="custom_column">Specific Column (CSV/JSON)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                      Column / Field Name (optional)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. salary or client_ssn"
                      value={newAnonFieldName}
                      onChange={(e) => setNewAnonFieldName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                      Transformation
                    </label>
                    <select
                      className="form-input"
                      value={newAnonTrans}
                      onChange={(e) => setNewAnonTrans(e.target.value)}
                    >
                      <option value="MASK">MASK (e.g. j***@example.com)</option>
                      <option value="PSEUDONYMIZE">PSEUDONYMIZE (e.g. Person_001)</option>
                      <option value="REDACT">REDACT ([REDACTED])</option>
                      <option value="REMOVE">REMOVE (Strip from content)</option>
                      <option value="DENY">DENY (Strict Field Exclusion)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleCreateAnonymisationRule}
                    className="btn-primary"
                    style={{ height: "42px", marginTop: "1rem" }}
                  >
                    Add Rule
                  </button>
                </div>
              </div>
            )}

            {/* Existing Rules Table */}
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Target Entity</th>
                  <th>Target Field / Column</th>
                  <th>Transformation Mode</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {policies.anonymisation_rules.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                      No custom anonymisation rules active.
                    </td>
                  </tr>
                ) : (
                  policies.anonymisation_rules.map((rule) => (
                    <tr key={rule.id}>
                      <td style={{ fontWeight: 600 }}>{rule.entity_type}</td>
                      <td>{rule.field_name || <span style={{ color: "var(--text-muted)" }}>All text entities</span>}</td>
                      <td>
                        <span className={`badge ${
                          rule.transformation === "ALLOW" ? "badge-allow" :
                          rule.transformation === "DENY" ? "badge-deny" : "badge-transform"
                        }`}>
                          {rule.transformation}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {new Date(rule.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        {workspace.role === "OWNER" && (
                          <button
                            onClick={() => handleDeleteAnonymisationRule(rule.id)}
                            className="btn-danger"
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MCP ACCESS & CREDENTIALS */}
      {/* ========================================================================= */}
      {activeTab === "mcp" && (
        <div>
          {/* Header Banner */}
          <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                  Private Model Context Protocol (MCP) Credentials
                </h3>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "700px" }}>
                  Generate private, high-entropy tokens to connect AI models (such as Claude Desktop or custom agents)
                  to this workspace. The database stores only a cryptographic HMAC hash of the token.
                </p>
              </div>
              {workspace.role === "OWNER" && (
                <button onClick={() => setNewMCPModal(true)} className="btn-primary">
                  + Create New Token
                </button>
              )}
            </div>

            <div className="code-box" style={{ marginBottom: "1rem" }}>
              MCP Gateway Endpoint: {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/mcp
            </div>
          </div>

          {/* Credentials Table */}
          <div className="glass-panel" style={{ overflow: "hidden" }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Prefix Identifier</th>
                  <th>Created</th>
                  <th>Expires</th>
                  <th>Last Used</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mcpCredentials.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                      No MCP credentials generated yet. Click &quot;Create New Token&quot; to connect Claude or an AI client.
                    </td>
                  </tr>
                ) : (
                  mcpCredentials.map((cred) => (
                    <tr key={cred.id}>
                      <td style={{ fontWeight: 600 }}>{cred.name}</td>
                      <td>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", color: "#a5b4fc" }}>
                          {cred.credential_prefix}...
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {new Date(cred.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {cred.expires_at ? new Date(cred.expires_at).toLocaleDateString() : "Never"}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {cred.last_used_at ? new Date(cred.last_used_at).toLocaleString() : "Never"}
                      </td>
                      <td>
                        <span className={`badge ${cred.is_active ? "badge-allow" : "badge-deny"}`}>
                          {cred.revoked_at ? "Revoked" : cred.is_active ? "Active" : "Expired"}
                        </span>
                      </td>
                      <td>
                        {workspace.role === "OWNER" && cred.is_active && (
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              onClick={() => handleRotateMCP(cred.id)}
                              className="btn-secondary"
                              style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
                            >
                              Rotate
                            </button>
                            <button
                              onClick={() => handleRevokeMCP(cred.id)}
                              className="btn-danger"
                              style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
                            >
                              Revoke
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: AUDIT LOGS */}
      {/* ========================================================================= */}
      {activeTab === "audit" && (
        <div className="glass-panel" style={{ overflow: "hidden" }}>
          <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Security Audit Event Trail</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Immutable log of authentication, authorization, and data read events. Secrets and raw documents are never logged.
              </p>
            </div>
            <button onClick={loadWorkspaceData} className="btn-secondary" style={{ fontSize: "0.85rem" }}>
              🔄 Refresh Logs
            </button>
          </div>

          <table className="custom-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Operation</th>
                <th>Actor</th>
                <th>Decision</th>
                <th>Reason</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                    No audit records recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem", fontWeight: 600 }}>
                      {log.operation}
                    </td>
                    <td>
                      <span className="badge badge-neutral">{log.actor_type}</span>
                    </td>
                    <td>
                      <span className={`badge ${
                        log.decision === "ALLOW" ? "badge-allow" :
                        log.decision === "DENY" ? "badge-deny" : "badge-transform"
                      }`}>
                        {log.decision}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)", maxWidth: "250px" }}>
                      {log.reason || "—"}
                    </td>
                    <td style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-muted)" }}>
                      {log.request_metadata ? JSON.stringify(log.request_metadata) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: PLAYGROUND */}
      {/* ========================================================================= */}
      {activeTab === "playground" && (
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            🧪 Interactive MCP Tool Test Console
          </h3>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            Test MCP JSON-RPC tool calls live using a valid MCP credential. Watch policies, field denials, and anonymisation in action.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            {/* Request Builder */}
            <div>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                  Bearer MCP Token
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="mcp_live_..."
                  value={playgroundToken}
                  onChange={(e) => setPlaygroundToken(e.target.value)}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Paste a token generated from the MCP Access tab.
                </span>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                  Tool / Method
                </label>
                <select
                  className="form-input"
                  value={playgroundTool}
                  onChange={(e) => {
                    setPlaygroundTool(e.target.value);
                    if (e.target.value === "read_resource") {
                      const firstFile = files[0]?.id || "";
                      setPlaygroundArgs(JSON.stringify({ resource_id: firstFile }, null, 2));
                    } else if (e.target.value === "search") {
                      setPlaygroundArgs(JSON.stringify({ query: "example" }, null, 2));
                    } else if (e.target.value === "query_dataset") {
                      const firstCsv = files.find((f) => f.file_type === "CSV" || f.file_type === "JSON")?.id || "";
                      setPlaygroundArgs(JSON.stringify({ resource_id: firstCsv, limit: 10 }, null, 2));
                    } else {
                      setPlaygroundArgs("{}");
                    }
                  }}
                >
                  <option value="workspace_info">workspace_info</option>
                  <option value="list_resources">list_resources</option>
                  <option value="get_resource_metadata">get_resource_metadata</option>
                  <option value="search">search</option>
                  <option value="read_resource">read_resource</option>
                  <option value="get_dataset_schema">get_dataset_schema</option>
                  <option value="query_dataset">query_dataset</option>
                  <option value="tools/list">tools/list (MCP Protocol)</option>
                </select>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                  Arguments (JSON)
                </label>
                <textarea
                  className="form-input"
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem", height: "140px" }}
                  value={playgroundArgs}
                  onChange={(e) => setPlaygroundArgs(e.target.value)}
                />
              </div>

              <button
                onClick={handleExecutePlayground}
                disabled={playgroundLoading}
                className="btn-primary"
                style={{ width: "100%", padding: "0.8rem" }}
              >
                {playgroundLoading ? "Executing Protocol Request..." : "Run MCP Request →"}
              </button>
            </div>

            {/* Response Viewer */}
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                JSON-RPC 2.0 Response
              </div>
              <div className="code-box" style={{ height: "350px", overflowY: "auto" }}>
                {playgroundResult ? (
                  <pre>{JSON.stringify(playgroundResult, null, 2)}</pre>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>
                    Response from the MCP gateway will appear here after execution.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === "settings" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          {/* Members Management */}
          <div className="glass-panel" style={{ padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Workspace Members
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Manage users who can view or administer this workspace.
            </p>

            {workspace.role === "OWNER" && (
              <form onSubmit={handleAddMember} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Username to add"
                  value={newMemberUsername}
                  onChange={(e) => setNewMemberUsername(e.target.value)}
                />
                <select
                  className="form-input"
                  style={{ width: "120px" }}
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="OWNER">OWNER</option>
                </select>
                <button type="submit" className="btn-primary" style={{ padding: "0.5rem 1rem" }}>
                  Add
                </button>
              </form>
            )}

            <div>
              {members.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{m.username || m.user_id}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Joined {new Date(m.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span className="badge badge-neutral">{m.role}</span>
                    {workspace.role === "OWNER" && m.user_id !== workspace.owner_id && (
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="btn-danger"
                        style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="glass-panel" style={{ padding: "1.75rem", border: "1px solid rgba(244, 63, 94, 0.3)" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--status-deny)", marginBottom: "0.5rem" }}>
              Danger Zone
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Permanently delete this workspace. All associated files, extracted texts, policies, and MCP credentials will be irreversibly removed.
            </p>

            {workspace.role === "OWNER" ? (
              <button
                onClick={handleDeleteWorkspace}
                className="btn-danger"
                style={{ padding: "0.75rem 1.5rem" }}
              >
                Delete Workspace Permanently
              </button>
            ) : (
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Only the workspace owner can delete this workspace.
              </span>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW EXTRACTED CONTENT */}
      {/* ========================================================================= */}
      {selectedFileContent && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 150,
          padding: "1.5rem",
        }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "800px", maxHeight: "85vh", display: "flex", flexDirection: "column", padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                Extracted Content: {selectedFileName}
              </h3>
              <button onClick={() => setSelectedFileContent(null)} className="btn-secondary" style={{ padding: "0.3rem 0.75rem" }}>
                ✕ Close
              </button>
            </div>

            <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
              <span className="badge badge-neutral">
                Detected PII Entities: {selectedFileContent.detected_entities?.length || 0}
              </span>
              <span className="badge badge-allow">Zero Raw URL Exposure</span>
            </div>

            <div className="code-box" style={{ flex: 1, overflowY: "auto", whiteSpace: "pre-wrap", marginBottom: "1.5rem" }}>
              {selectedFileContent.plain_text}
            </div>

            {selectedFileContent.detected_entities && selectedFileContent.detected_entities.length > 0 && (
              <div style={{ maxHeight: "150px", overflowY: "auto", background: "rgba(10, 14, 23, 0.5)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                  Detected Entities & Positions:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {selectedFileContent.detected_entities.map((e, idx) => (
                    <span key={idx} className="badge badge-transform" style={{ fontSize: "0.75rem" }}>
                      {e.entity_type}: {e.value}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GENERATE MCP CREDENTIAL */}
      {/* ========================================================================= */}
      {newMCPModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 150,
          padding: "1.5rem",
        }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "480px", padding: "2rem" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Generate Private MCP Credential
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Generates a cryptographically random, high-entropy token. The raw secret is returned ONCE and never stored.
            </p>

            <form onSubmit={handleCreateMCPCredential}>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                  Credential Label
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Claude Desktop or Production Agent"
                  value={newMCPName}
                  onChange={(e) => setNewMCPName(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button type="button" onClick={() => setNewMCPModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Generate Credential
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ONE-TIME TOKEN REVEAL */}
      {/* ========================================================================= */}
      {createdCredential && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 200,
          padding: "1.5rem",
        }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "620px", padding: "2rem" }}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔑</div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#fff" }}>
                Save Your Private MCP Token
              </h3>
              <p style={{
                fontSize: "0.85rem",
                color: "var(--status-deny)",
                background: "var(--status-deny-bg)",
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-sm)",
                marginTop: "0.75rem",
                border: "1px solid rgba(244, 63, 94, 0.3)",
              }}>
                ⚠️ WARNING: This token will NEVER be shown again. Store it securely in your password manager or client config.
              </p>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                Raw Private MCP Token
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  readOnly
                  value={createdCredential.raw_token}
                  className="form-input"
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem", background: "rgba(10, 14, 23, 0.9)" }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdCredential.raw_token);
                    notify("success", "Token copied to clipboard!");
                  }}
                  className="btn-primary"
                  style={{ padding: "0 1.25rem" }}
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Claude Desktop Config Generator */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                Claude Desktop Configuration Snippet (`claude_desktop_config.json`)
              </div>
              <div className="code-box">
                <pre>{JSON.stringify({
                  mcpServers: {
                    [workspace.name.toLowerCase().replace(/\s+/g, "-")]: {
                      url: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/mcp`,
                      headers: {
                        Authorization: `Bearer ${createdCredential.raw_token}`,
                      },
                    },
                  },
                }, null, 2)}</pre>
              </div>
            </div>

            <button
              onClick={() => setCreatedCredential(null)}
              className="btn-primary"
              style={{ width: "100%", padding: "0.8rem" }}
            >
              I Have Securely Saved This Token
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
