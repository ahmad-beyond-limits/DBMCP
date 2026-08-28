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
import {
  FolderGit2,
  FileText,
  Shield,
  EyeOff,
  Key,
  ScrollText,
  Terminal,
  Settings,
  Upload,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  X,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

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
  const [copiedToken, setCopiedToken] = useState(false);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    try {
      const file = fileList[0];
      await api.uploadFile(workspaceId, file);
      notify("success", `File '${file.name}' processed successfully.`);
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
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      await api.deleteFile(workspaceId, fileId);
      notify("success", "File deleted.");
      setFiles(files.filter((f) => f.id !== fileId));
    } catch (err: any) {
      notify("error", err.message || "Failed to delete file");
    }
  };

  const handleCreateResourcePolicy = async () => {
    try {
      const resourceId = newResourceFileId === "default" ? null : newResourceFileId;
      await api.createResourcePolicy(workspaceId, resourceId, "read_resource", newResourceDecision);
      notify("success", "Resource policy saved.");
      const updated = await api.getPolicies(workspaceId);
      setPolicies(updated);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleDeleteResourcePolicy = async (policyId: string) => {
    try {
      await api.deleteResourcePolicy(workspaceId, policyId);
      notify("success", "Policy deleted.");
      const updated = await api.getPolicies(workspaceId);
      setPolicies(updated);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleCreateOperationPolicy = async () => {
    try {
      await api.createOperationPolicy(workspaceId, newOpName, newOpDecision);
      notify("success", "Operation policy saved.");
      const updated = await api.getPolicies(workspaceId);
      setPolicies(updated);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleDeleteOperationPolicy = async (policyId: string) => {
    try {
      await api.deleteOperationPolicy(workspaceId, policyId);
      notify("success", "Policy deleted.");
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
      notify("success", "Anonymisation rule saved.");
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
      notify("success", "Rule deleted.");
      const updated = await api.getPolicies(workspaceId);
      setPolicies(updated);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleCreateMCPCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createMCPCredential(workspaceId, newMCPName);
      setCreatedCredential(created);
      setNewMCPModal(false);
      setNewMCPName("Claude Assistant");
      setPlaygroundToken(created.raw_token);
      const updated = await api.getMCPCredentials(workspaceId);
      setMCPCredentials(updated);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleRotateMCP = async (credentialId: string) => {
    if (!confirm("Rotating will revoke the current token and generate a replacement. Continue?")) return;
    try {
      const rotated = await api.rotateMCPCredential(workspaceId, credentialId);
      setCreatedCredential(rotated);
      setPlaygroundToken(rotated.raw_token);
      const updated = await api.getMCPCredentials(workspaceId);
      setMCPCredentials(updated);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleRevokeMCP = async (credentialId: string) => {
    if (!confirm("Revoking will immediately disable this token. Continue?")) return;
    try {
      await api.revokeMCPCredential(workspaceId, credentialId);
      notify("success", "Credential revoked.");
      const updated = await api.getMCPCredentials(workspaceId);
      setMCPCredentials(updated);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addMember(workspaceId, newMemberUsername.trim(), newMemberRole);
      notify("success", `Added user '${newMemberUsername}'.`);
      setNewMemberUsername("");
      const updated = await api.getMembers(workspaceId);
      setMembers(updated);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await api.removeMember(workspaceId, memberId);
      notify("success", "Member removed.");
      const updated = await api.getMembers(workspaceId);
      setMembers(updated);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleDeleteWorkspace = async () => {
    const confirmName = prompt(`Type "${workspace?.name}" to confirm deletion:`);
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
      notify("error", "Please provide a valid token (mcp_live_...)");
      return;
    }
    setPlaygroundLoading(true);
    setPlaygroundResult(null);
    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(playgroundArgs);
      } catch {
        throw new Error("Invalid JSON in arguments");
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
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "65vh" }}>
        <div style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Loading workspace...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "2.5rem 2rem 5rem 2rem" }}>
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: "fixed",
          bottom: "2.5rem",
          right: "2.5rem",
          zIndex: 200,
          background: notification.type === "success" ? "#0f172a" : "#dc2626",
          color: "#ffffff",
          padding: "0.75rem 1.25rem",
          borderRadius: "var(--radius-pill)",
          boxShadow: "var(--shadow-lg)",
          fontWeight: 600,
          fontSize: "0.85rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}>
          {notification.type === "success" ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header Breadcrumbs & Quick Actions */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: "2rem",
        paddingBottom: "1.5rem",
        borderBottom: "1px solid var(--border-card)",
        flexWrap: "wrap",
        gap: "1.25rem",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
            <Link href="/dashboard" className="slash-tag" style={{ textDecoration: "none", margin: 0 }}>
              WORKSPACES
            </Link>
            <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>/</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
              {workspace.id.substring(0, 14)}...
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <h1 className="font-editorial" style={{ fontSize: "clamp(1.7rem, 2.5vw, 2.2rem)", letterSpacing: "-0.02em" }}>
              {workspace.name}
            </h1>
            <span className={`badge-status ${workspace.is_active ? "badge-status-allow" : "badge-status-deny"}`}>
              {workspace.is_active ? "Active" : "Disabled"}
            </span>
            <span className="badge-status" style={{ background: "#f1f5f9", color: "var(--text-secondary)" }}>
              {workspace.role}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {workspace.role === "OWNER" && (
            <button onClick={() => setNewMCPModal(true)} className="pill-btn pill-btn-primary">
              <Key size={14} />
              Generate MCP Key
            </button>
          )}
        </div>
      </div>

      {/* Clean Pill Tabs Bar */}
      <div style={{ marginBottom: "2rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
        <div className="pill-tabs-bar" style={{ display: "flex", flexWrap: "nowrap" }}>
          {[
            { id: "overview", label: "Overview", icon: <FolderGit2 size={14} /> },
            { id: "files", label: `Files (${files.length})`, icon: <FileText size={14} /> },
            { id: "policies", label: `Policies (${policies.resource_policies.length + policies.operation_policies.length})`, icon: <Shield size={14} /> },
            { id: "anonymisation", label: `Anonymisation (${policies.anonymisation_rules.length})`, icon: <EyeOff size={14} /> },
            { id: "mcp", label: `MCP Access (${mcpCredentials.length})`, icon: <Key size={14} /> },
            { id: "audit", label: `Audit Logs (${auditLogs.length})`, icon: <ScrollText size={14} /> },
            { id: "playground", label: "Playground", icon: <Terminal size={14} /> },
            { id: "settings", label: "Settings", icon: <Settings size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pill-tab ${activeTab === tab.id ? "active" : ""}`}
              style={{ display: "flex", alignItems: "center", gap: "0.45rem", whiteSpace: "nowrap" }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div>
          {/* Quick Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2.5rem" }}>
            <div className="frosted-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Files Uploaded
                </span>
                <FileText size={17} color="#475569" />
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 800 }}>{files.length}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Parsed and indexed</div>
            </div>

            <div className="frosted-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Resource Policies
                </span>
                <Shield size={17} color="#475569" />
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 800 }}>{policies.resource_policies.length}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>File-level rules</div>
            </div>

            <div className="frosted-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Anonymisation Rules
                </span>
                <EyeOff size={17} color="#475569" />
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 800 }}>{policies.anonymisation_rules.length}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>PII transforms active</div>
            </div>

            <div className="frosted-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Live MCP Keys
                </span>
                <Key size={17} color="#475569" />
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 800 }}>
                {mcpCredentials.filter((c) => c.is_active).length}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Active bearer tokens</div>
            </div>
          </div>

          {/* Clean Overview Card */}
          <div className="frosted-panel" style={{ padding: "2.5rem", marginBottom: "2.5rem" }}>
            <div className="slash-tag">SECURITY OVERVIEW</div>
            <h3 className="font-editorial" style={{ fontSize: "1.35rem", marginBottom: "0.75rem" }}>
              Workspace Access Control Model
            </h3>
            <p style={{ fontSize: "0.92rem", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: "720px", marginBottom: "1.5rem" }}>
              Requests through the Model Context Protocol (MCP) resolve workspace scope from the bearer credential.
              AI models never receive direct database connection strings or raw cloud storage URLs. Every request is verified against policies and PII rules.
            </p>
            <div style={{
              padding: "0.85rem 1.25rem",
              background: "#f8fafc",
              border: "1px solid var(--border-card)",
              borderRadius: "var(--radius-md)",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "0.8rem",
              color: "#0f172a",
              display: "inline-block",
            }}>
              AI Client ➔ Bearer Token ➔ Policy Precedence ➔ PII Engine ➔ Sanitized MCP Output
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FILES */}
      {/* ========================================================================= */}
      {activeTab === "files" && (
        <div>
          {/* Upload Dropzone */}
          <div className="frosted-panel" style={{ padding: "2.5rem 2rem", marginBottom: "2rem", textAlign: "center" }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem auto",
              color: "#0f172a",
            }}>
              <Upload size={22} />
            </div>
            <h3 className="font-editorial" style={{ fontSize: "1.3rem", marginBottom: "0.35rem" }}>
              Upload Document or Dataset
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", maxWidth: "520px", margin: "0 auto 1.5rem auto", lineHeight: 1.5 }}>
              Supported: PDF, DOCX, TXT, CSV, JSON (up to 50MB). Content is parsed and scanned for PII immediately.
            </p>

            <label className="pill-btn pill-btn-primary" style={{ cursor: "pointer" }}>
              <Upload size={15} />
              <span>{uploading ? "Uploading & Parsing..." : "Choose File"}</span>
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
          <div className="frosted-panel" style={{ overflow: "hidden" }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "3.5rem", color: "var(--text-muted)" }}>
                      No files uploaded yet.
                    </td>
                  </tr>
                ) : (
                  files.map((file) => (
                    <tr key={file.id}>
                      <td style={{ fontWeight: 600 }}>{file.original_filename}</td>
                      <td>
                        <span className="badge-status" style={{ background: "#f1f5f9", color: "var(--text-secondary)" }}>
                          {file.file_type}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem" }}>
                        {(file.file_size / 1024).toFixed(1)} KB
                      </td>
                      <td>
                        <span className={`badge-status ${file.status === "READY" ? "badge-status-allow" : file.status === "FAILED" ? "badge-status-deny" : "badge-status-transform"}`}>
                          {file.status}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        {new Date(file.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => handleViewContent(file)}
                            className="pill-btn pill-btn-dark"
                            style={{ padding: "0.3rem 0.75rem", fontSize: "0.78rem" }}
                          >
                            Extracted Text
                          </button>
                          {workspace.role === "OWNER" && (
                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              className="pill-btn pill-btn-dark"
                              style={{ padding: "0.3rem 0.6rem", color: "var(--status-deny)" }}
                            >
                              <Trash2 size={13} />
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "2rem" }}>
          {/* Resource Access Policies */}
          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div className="slash-tag">FILE ACCESS</div>
            <h3 className="font-editorial" style={{ fontSize: "1.25rem", marginBottom: "0.35rem" }}>
              Resource Policies
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Set read permissions for specific files or workspace default. Explicit DENY overrides ALLOW.
            </p>

            {workspace.role === "OWNER" && (
              <div style={{
                background: "#f8fafc",
                padding: "1rem 1.25rem",
                borderRadius: "var(--radius-md)",
                marginBottom: "1.5rem",
                border: "1px solid var(--border-card)",
              }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.6rem", color: "var(--text-muted)" }}>
                  Add Resource Rule
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <select
                    className="modern-input"
                    style={{ flex: 1, minWidth: "160px" }}
                    value={newResourceFileId}
                    onChange={(e) => setNewResourceFileId(e.target.value)}
                  >
                    <option value="default">Default (All Files)</option>
                    {files.map((f) => (
                      <option key={f.id} value={f.id}>{f.original_filename}</option>
                    ))}
                  </select>

                  <select
                    className="modern-input"
                    style={{ width: "105px" }}
                    value={newResourceDecision}
                    onChange={(e) => setNewResourceDecision(e.target.value)}
                  >
                    <option value="ALLOW">ALLOW</option>
                    <option value="DENY">DENY</option>
                  </select>

                  <button onClick={handleCreateResourcePolicy} className="pill-btn pill-btn-primary" style={{ padding: "0.5rem 1rem" }}>
                    Save
                  </button>
                </div>
              </div>
            )}

            <div>
              {policies.resource_policies.length === 0 ? (
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", padding: "0.5rem 0" }}>
                  No custom rules. Default workspace permissions apply.
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
                        padding: "0.75rem 0",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                          {targetFile ? targetFile.original_filename : "All Files (Default)"}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{p.operation}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span className={`badge-status ${p.decision === "ALLOW" ? "badge-status-allow" : "badge-status-deny"}`}>
                          {p.decision}
                        </span>
                        {workspace.role === "OWNER" && (
                          <button
                            onClick={() => handleDeleteResourcePolicy(p.id)}
                            style={{ color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer" }}
                          >
                            <X size={15} />
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
          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div className="slash-tag">OPERATION ACCESS</div>
            <h3 className="font-editorial" style={{ fontSize: "1.25rem", marginBottom: "0.35rem" }}>
              Operation Policies
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Permit or block specific MCP operations executed by AI clients.
            </p>

            {workspace.role === "OWNER" && (
              <div style={{
                background: "#f8fafc",
                padding: "1rem 1.25rem",
                borderRadius: "var(--radius-md)",
                marginBottom: "1.5rem",
                border: "1px solid var(--border-card)",
              }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.6rem", color: "var(--text-muted)" }}>
                  Configure Operation Rule
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <select
                    className="modern-input"
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
                    className="modern-input"
                    style={{ width: "105px" }}
                    value={newOpDecision}
                    onChange={(e) => setNewOpDecision(e.target.value)}
                  >
                    <option value="ALLOW">ALLOW</option>
                    <option value="DENY">DENY</option>
                  </select>

                  <button onClick={handleCreateOperationPolicy} className="pill-btn pill-btn-primary" style={{ padding: "0.5rem 1rem" }}>
                    Save
                  </button>
                </div>
              </div>
            )}

            <div>
              {policies.operation_policies.length === 0 ? (
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", padding: "0.5rem 0" }}>
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
                      padding: "0.75rem 0",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem", fontWeight: 600 }}>
                      {op.operation}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span className={`badge-status ${op.decision === "ALLOW" ? "badge-status-allow" : "badge-status-deny"}`}>
                        {op.decision}
                      </span>
                      {workspace.role === "OWNER" && (
                        <button
                          onClick={() => handleDeleteOperationPolicy(op.id)}
                          style={{ color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer" }}
                        >
                          <X size={15} />
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
          <div className="frosted-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
            <div className="slash-tag">PII TRANSFORMATION</div>
            <h3 className="font-editorial" style={{ fontSize: "1.35rem", marginBottom: "0.35rem" }}>
              Field &amp; Entity Anonymisation Rules
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.75rem", lineHeight: 1.5 }}>
              Define how PII entities or tabular columns are masked at read-time. Original files in storage remain untouched.
            </p>

            {workspace.role === "OWNER" && (
              <div style={{
                background: "#f8fafc",
                padding: "1.25rem",
                borderRadius: "var(--radius-md)",
                marginBottom: "2rem",
                border: "1px solid var(--border-card)",
              }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.75rem", color: "var(--text-muted)" }}>
                  New Transformation Rule
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", alignItems: "flex-end" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.3rem", fontWeight: 600 }}>
                      Entity Type
                    </label>
                    <select
                      className="modern-input"
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
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.3rem", fontWeight: 600 }}>
                      Column Name (optional)
                    </label>
                    <input
                      type="text"
                      className="modern-input"
                      placeholder="e.g. salary or client_ssn"
                      value={newAnonFieldName}
                      onChange={(e) => setNewAnonFieldName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.3rem", fontWeight: 600 }}>
                      Transformation Mode
                    </label>
                    <select
                      className="modern-input"
                      value={newAnonTrans}
                      onChange={(e) => setNewAnonTrans(e.target.value)}
                    >
                      <option value="MASK">MASK (j***@example.com)</option>
                      <option value="PSEUDONYMIZE">PSEUDONYMIZE (Person_001)</option>
                      <option value="REDACT">REDACT ([REDACTED])</option>
                      <option value="REMOVE">REMOVE (Strip from output)</option>
                      <option value="DENY">DENY (Strict Field Exclusion)</option>
                    </select>
                  </div>

                  <div>
                    <button
                      onClick={handleCreateAnonymisationRule}
                      className="pill-btn pill-btn-primary"
                      style={{ width: "100%", padding: "0.75rem" }}
                    >
                      <Plus size={15} />
                      Add Rule
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Rules Table */}
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Target Entity</th>
                  <th>Target Field</th>
                  <th>Transformation Mode</th>
                  <th>Created</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {policies.anonymisation_rules.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                      No custom rules active.
                    </td>
                  </tr>
                ) : (
                  policies.anonymisation_rules.map((rule) => (
                    <tr key={rule.id}>
                      <td style={{ fontWeight: 600 }}>{rule.entity_type}</td>
                      <td style={{ color: "var(--text-secondary)", fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem" }}>
                        {rule.field_name || "All text entities"}
                      </td>
                      <td>
                        <span className={`badge-status ${rule.transformation === "ALLOW" ? "badge-status-allow" : rule.transformation === "DENY" ? "badge-status-deny" : "badge-status-transform"}`}>
                          {rule.transformation}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {new Date(rule.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {workspace.role === "OWNER" && (
                          <button
                            onClick={() => handleDeleteAnonymisationRule(rule.id)}
                            className="pill-btn pill-btn-dark"
                            style={{ padding: "0.25rem 0.5rem", color: "var(--status-deny)" }}
                          >
                            <Trash2 size={13} />
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
          <div className="frosted-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <div className="slash-tag">CLIENT AUTHENTICATION</div>
                <h3 className="font-editorial" style={{ fontSize: "1.35rem", marginBottom: "0.35rem" }}>
                  Model Context Protocol Credentials
                </h3>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", maxWidth: "660px", lineHeight: 1.5 }}>
                  Generate bearer credentials to connect Claude Desktop, Cursor, or agents. The database stores only a cryptographic HMAC hash.
                </p>
              </div>
              {workspace.role === "OWNER" && (
                <button onClick={() => setNewMCPModal(true)} className="pill-btn pill-btn-primary">
                  <Plus size={15} />
                  Create Token
                </button>
              )}
            </div>

            <div style={{
              padding: "0.85rem 1.15rem",
              background: "#f8fafc",
              border: "1px solid var(--border-card)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "0.8rem",
            }}>
              <span style={{ color: "var(--text-secondary)" }}>
                MCP Endpoint: <strong style={{ color: "#0f172a" }}>{process.env.NEXT_PUBLIC_API_URL || "https://dbmcp.onrender.com"}/mcp</strong>
              </span>
              <span className="badge-status badge-status-allow">JSON-RPC 2.0</span>
            </div>
          </div>

          {/* Credentials Table */}
          <div className="frosted-panel" style={{ overflow: "hidden" }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Prefix Identifier</th>
                  <th>Created</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mcpCredentials.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "3.5rem", color: "var(--text-muted)" }}>
                      No tokens generated yet. Click &quot;Create Token&quot; to connect Claude or an AI client.
                    </td>
                  </tr>
                ) : (
                  mcpCredentials.map((cred) => (
                    <tr key={cred.id}>
                      <td style={{ fontWeight: 600 }}>{cred.name}</td>
                      <td style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem", color: "#2563eb" }}>
                        {cred.credential_prefix}...
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        {new Date(cred.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        {cred.expires_at ? new Date(cred.expires_at).toLocaleDateString() : "Never"}
                      </td>
                      <td>
                        <span className={`badge-status ${cred.revoked_at ? "badge-status-deny" : cred.is_active ? "badge-status-allow" : "badge-status-transform"}`}>
                          {cred.revoked_at ? "Revoked" : cred.is_active ? "Active" : "Expired"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {workspace.role === "OWNER" && cred.is_active && (
                          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => handleRotateMCP(cred.id)}
                              className="pill-btn pill-btn-dark"
                              style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem" }}
                            >
                              Rotate
                            </button>
                            <button
                              onClick={() => handleRevokeMCP(cred.id)}
                              className="pill-btn pill-btn-dark"
                              style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem", color: "var(--status-deny)" }}
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
        <div className="frosted-panel" style={{ overflow: "hidden" }}>
          <div style={{
            padding: "1.5rem 2rem",
            borderBottom: "1px solid var(--border-card)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}>
            <div>
              <div className="slash-tag">AUDIT LOGS</div>
              <h3 className="font-editorial" style={{ fontSize: "1.25rem" }}>Security Event Trail</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                Immutable event record. Passwords, secrets, and raw documents are never logged.
              </p>
            </div>
            <button onClick={loadWorkspaceData} className="pill-btn pill-btn-dark" style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}>
              <RefreshCw size={13} />
              Refresh
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
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "3.5rem", color: "var(--text-muted)" }}>
                    No audit events recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ color: "var(--text-muted)", whiteSpace: "nowrap", fontFamily: "JetBrains Mono, monospace", fontSize: "0.78rem" }}>
                      {new Date(log.timestamp).toLocaleTimeString()} · {new Date(log.timestamp).toLocaleDateString()}
                    </td>
                    <td style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 600, fontSize: "0.85rem" }}>
                      {log.operation}
                    </td>
                    <td>
                      <span className="badge-status" style={{ background: "#f1f5f9", color: "var(--text-secondary)" }}>
                        {log.actor_type}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-status ${log.decision === "ALLOW" ? "badge-status-allow" : log.decision === "DENY" ? "badge-status-deny" : "badge-status-transform"}`}>
                        {log.decision}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)", maxWidth: "320px", fontSize: "0.82rem" }}>
                      {log.reason || "—"}
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
        <div className="frosted-panel" style={{ padding: "2rem" }}>
          <div className="slash-tag">TEST CONSOLE</div>
          <h3 className="font-editorial" style={{ fontSize: "1.35rem", marginBottom: "0.35rem" }}>
            MCP Tool Test Console
          </h3>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.75rem" }}>
            Test MCP JSON-RPC tool calls live using your bearer token.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.75rem" }}>
            {/* Request Builder */}
            <div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
                  Bearer MCP Token
                </label>
                <input
                  type="text"
                  className="modern-input"
                  placeholder="mcp_live_..."
                  value={playgroundToken}
                  onChange={(e) => setPlaygroundToken(e.target.value)}
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
                  Tool Name
                </label>
                <select
                  className="modern-input"
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
                  <option value="tools/list">tools/list (Protocol Schema)</option>
                </select>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
                  Arguments (JSON)
                </label>
                <textarea
                  className="modern-input"
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem", height: "130px", resize: "vertical" }}
                  value={playgroundArgs}
                  onChange={(e) => setPlaygroundArgs(e.target.value)}
                />
              </div>

              <button
                onClick={handleExecutePlayground}
                disabled={playgroundLoading}
                className="pill-btn pill-btn-primary"
                style={{ width: "100%", padding: "0.75rem" }}
              >
                <Terminal size={15} />
                {playgroundLoading ? "Running Request..." : "Run MCP Request"}
                <div className="btn-arrow-circle">
                  <ArrowRight size={11} />
                </div>
              </button>
            </div>

            {/* Response Viewer */}
            <div className="browser-window" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div className="browser-header">
                <div className="browser-dots">
                  <div className="browser-dot dot-red" />
                  <div className="browser-dot dot-yellow" />
                  <div className="browser-dot dot-green" />
                </div>
                <div style={{ fontSize: "0.72rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-muted)" }}>
                  response.json
                </div>
              </div>

              <div style={{
                flex: 1,
                padding: "1rem 1.25rem",
                background: "#ffffff",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "0.8rem",
                overflowY: "auto",
                maxHeight: "360px",
              }}>
                {playgroundResult ? (
                  <pre style={{ color: "#0f172a" }}>{JSON.stringify(playgroundResult, null, 2)}</pre>
                ) : (
                  <div style={{ color: "var(--text-muted)", fontStyle: "italic", paddingTop: "2rem", textAlign: "center" }}>
                    Response from MCP gateway will appear here after execution.
                  </div>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "2rem" }}>
          {/* Members Management */}
          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div className="slash-tag">MEMBERS</div>
            <h3 className="font-editorial" style={{ fontSize: "1.25rem", marginBottom: "0.35rem" }}>
              Workspace Access
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Manage users who can view or administer this workspace.
            </p>

            {workspace.role === "OWNER" && (
              <form onSubmit={handleAddMember} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.75rem" }}>
                <input
                  type="text"
                  required
                  className="modern-input"
                  placeholder="Username to add"
                  value={newMemberUsername}
                  onChange={(e) => setNewMemberUsername(e.target.value)}
                />
                <select
                  className="modern-input"
                  style={{ width: "120px" }}
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="OWNER">OWNER</option>
                </select>
                <button type="submit" className="pill-btn pill-btn-primary" style={{ padding: "0.5rem 1.1rem" }}>
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
                    padding: "0.8rem 0",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{m.username || m.user_id}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Joined {new Date(m.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span className="badge-status" style={{ background: "#f1f5f9", color: "var(--text-secondary)" }}>{m.role}</span>
                    {workspace.role === "OWNER" && m.user_id !== workspace.owner_id && (
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        style={{ color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="frosted-panel" style={{ padding: "2rem", border: "1px solid #fecaca" }}>
            <div className="slash-tag" style={{ color: "var(--status-deny)" }}>DANGER ZONE</div>
            <h3 className="font-editorial" style={{ fontSize: "1.25rem", color: "var(--status-deny)", marginBottom: "0.35rem" }}>
              Delete Workspace
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
              Permanently delete this workspace and all associated files, policies, and credentials.
            </p>

            {workspace.role === "OWNER" ? (
              <button
                onClick={handleDeleteWorkspace}
                className="pill-btn pill-btn-dark"
                style={{ color: "var(--status-deny)", borderColor: "#fecaca" }}
              >
                <Trash2 size={14} />
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
          background: "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 150,
          padding: "1.5rem",
        }}>
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: "800px",
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
            padding: "2rem",
            position: "relative",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius-xl)",
          }}>
            <button
              onClick={() => setSelectedFileContent(null)}
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "#f1f5f9",
                border: "none",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={15} />
            </button>

            <div className="slash-tag">PARSED CONTENT</div>
            <h3 className="font-editorial" style={{ fontSize: "1.35rem", marginBottom: "0.35rem" }}>
              {selectedFileName}
            </h3>

            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <span className="badge-status badge-status-allow">Parsed</span>
              <span className="badge-status badge-status-transform">
                Detected PII: {selectedFileContent.detected_entities?.length || 0}
              </span>
            </div>

            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "1rem 1.25rem",
              background: "#f8fafc",
              border: "1px solid var(--border-card)",
              borderRadius: "var(--radius-md)",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "0.8rem",
              lineHeight: 1.6,
              color: "#0f172a",
              whiteSpace: "pre-wrap",
              marginBottom: "1.25rem",
            }}>
              {selectedFileContent.plain_text}
            </div>

            {selectedFileContent.detected_entities && selectedFileContent.detected_entities.length > 0 && (
              <div style={{
                maxHeight: "120px",
                overflowY: "auto",
                background: "#ffffff",
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-card)",
              }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                  Detected Entities:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                  {selectedFileContent.detected_entities.map((e, idx) => (
                    <span key={idx} className="badge-status badge-status-transform" style={{ fontSize: "0.72rem" }}>
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
          background: "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 150,
          padding: "1.5rem",
        }}>
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: "460px",
            padding: "2.5rem 2.25rem",
            position: "relative",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius-xl)",
          }}>
            <button
              onClick={() => setNewMCPModal(false)}
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "#f1f5f9",
                border: "none",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={15} />
            </button>

            <div className="slash-tag">NEW CREDENTIAL</div>
            <h3 className="font-editorial" style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>
              Generate MCP Token
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
              Generates a secure bearer token. The raw token will be revealed once.
            </p>

            <form onSubmit={handleCreateMCPCredential}>
              <div style={{ marginBottom: "1.75rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
                  Token Label
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="modern-input"
                  placeholder="e.g. Claude Desktop"
                  value={newMCPName}
                  onChange={(e) => setNewMCPName(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button type="button" onClick={() => setNewMCPModal(false)} className="pill-btn pill-btn-dark">
                  Cancel
                </button>
                <button type="submit" className="pill-btn pill-btn-primary">
                  <Key size={14} />
                  Generate
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
          background: "rgba(15, 23, 42, 0.55)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 200,
          padding: "1.5rem",
        }}>
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: "640px",
            padding: "2.75rem 2.25rem",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius-xl)",
          }}>
            <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
              <div className="slash-tag" style={{ justifyContent: "center" }}>SAVE CREDENTIAL</div>
              <h3 className="font-editorial" style={{ fontSize: "1.6rem", marginBottom: "0.4rem" }}>
                Your Private MCP Token
              </h3>
              <p style={{
                fontSize: "0.82rem",
                color: "var(--status-deny)",
                background: "var(--status-deny-bg)",
                padding: "0.5rem 0.85rem",
                borderRadius: "var(--radius-pill)",
                display: "inline-block",
                border: "1px solid #fecaca",
              }}>
                Save this token now. It cannot be recovered once this modal is closed.
              </p>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                Raw MCP Token
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  readOnly
                  value={createdCredential.raw_token}
                  className="modern-input"
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem" }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdCredential.raw_token);
                    setCopiedToken(true);
                    notify("success", "Token copied to clipboard.");
                    setTimeout(() => setCopiedToken(false), 2000);
                  }}
                  className="pill-btn pill-btn-primary"
                  style={{ padding: "0 1.15rem" }}
                >
                  {copiedToken ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copiedToken ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Claude Desktop Config Snippet */}
            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                Claude Desktop Config Snippet
              </div>
              <div style={{
                padding: "0.9rem 1.15rem",
                background: "#f8fafc",
                border: "1px solid var(--border-card)",
                borderRadius: "var(--radius-md)",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "0.78rem",
                overflowX: "auto",
                color: "#0f172a",
              }}>
                <pre>{JSON.stringify({
                  mcpServers: {
                    [workspace.name.toLowerCase().replace(/\s+/g, "-")]: {
                      url: `${process.env.NEXT_PUBLIC_API_URL || "https://dbmcp.onrender.com"}/mcp`,
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
              className="pill-btn pill-btn-primary"
              style={{ width: "100%", padding: "0.8rem" }}
            >
              Done, I Have Saved This Token
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
