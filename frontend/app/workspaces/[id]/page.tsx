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
  ExternalLink,
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
    if (!confirm("Rotating will immediately invalidate the current token and generate a new one. Continue?")) return;
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
      notify("success", "Credential revoked");
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
      notify("success", `User '${newMemberUsername}' added as ${newMemberRole}`);
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
      notify("success", "Member removed");
      const updated = await api.getMembers(workspaceId);
      setMembers(updated);
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
        <div className="callout-pin" style={{ position: "static", animation: "none" }}>
          <span className="pin-icon-circle">+</span>
          <span>Loading Workspace Security Boundary...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "2.5rem 2rem 5rem 2rem" }}>
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: "fixed",
          bottom: "2.5rem",
          right: "2.5rem",
          zIndex: 200,
          background: notification.type === "success" ? "rgba(16, 185, 129, 0.95)" : "rgba(244, 63, 94, 0.95)",
          color: "#ffffff",
          padding: "0.85rem 1.4rem",
          borderRadius: "var(--radius-pill)",
          boxShadow: "0 16px 36px rgba(0, 0, 0, 0.5)",
          fontWeight: 600,
          fontSize: "0.88rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          backdropFilter: "blur(12px)",
        }}>
          {notification.type === "success" ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header Breadcrumbs & Quick Actions (Reference 2 Editorial Style) */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: "2rem",
        paddingBottom: "1.5rem",
        borderBottom: "1px solid var(--border-subtle)",
        flexWrap: "wrap",
        gap: "1.5rem",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <Link href="/dashboard" className="slash-tag" style={{ textDecoration: "none", margin: 0 }}>
              WORKSPACES
            </Link>
            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>/</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "JetBrains Mono, monospace" }}>
              {workspace.id.substring(0, 12)}...
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <h1 className="font-editorial" style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)", letterSpacing: "-0.02em" }}>
              {workspace.name}
            </h1>
            <span className={`badge-status ${workspace.is_active ? "badge-status-allow" : "badge-status-deny"}`}>
              {workspace.is_active ? "Active Gateway" : "Suspended"}
            </span>
            <span className="badge-status badge-status-transform">{workspace.role}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {workspace.role === "OWNER" && (
            <button onClick={() => setNewMCPModal(true)} className="pill-btn pill-btn-cyan">
              <Key size={15} />
              Generate MCP Key
              <div className="btn-arrow-circle">
                <ArrowRight size={12} />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Modern 8-Tab Navigation Bar (Reference 1 Category Pills) */}
      <div style={{ marginBottom: "2.5rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
        <div className="pill-tabs-bar" style={{ display: "flex", flexWrap: "nowrap" }}>
          {[
            { id: "overview", label: "Overview", icon: <FolderGit2 size={14} /> },
            { id: "files", label: `Files (${files.length})`, icon: <FileText size={14} /> },
            { id: "policies", label: `Policies (${policies.resource_policies.length + policies.operation_policies.length})`, icon: <Shield size={14} /> },
            { id: "anonymisation", label: `Anonymisation (${policies.anonymisation_rules.length})`, icon: <EyeOff size={14} /> },
            { id: "mcp", label: `MCP Access (${mcpCredentials.length})`, icon: <Key size={14} /> },
            { id: "audit", label: `Audit Trail (${auditLogs.length})`, icon: <ScrollText size={14} /> },
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
          {/* Quick Metrics (Reference 2 Grid) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2.5rem" }}>
            <div className="frosted-panel" style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Isolated Documents
                </span>
                <FileText size={18} color="#38bdf8" />
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: 800 }}>{files.length}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Extracted &amp; PII-scanned</div>
            </div>

            <div className="frosted-panel" style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Resource Policies
                </span>
                <Shield size={18} color="#818cf8" />
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "#818cf8" }}>{policies.resource_policies.length}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Per-resource access gates</div>
            </div>

            <div className="frosted-panel" style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Anonymisation Rules
                </span>
                <EyeOff size={18} color="#fbbf24" />
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "#fbbf24" }}>{policies.anonymisation_rules.length}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Active field/entity transforms</div>
            </div>

            <div className="frosted-panel" style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Active MCP Tokens
                </span>
                <Key size={18} color="#10b981" />
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "#10b981" }}>
                {mcpCredentials.filter((c) => c.is_active).length}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Live bearer credentials</div>
            </div>
          </div>

          {/* Security Boundary Showcase with Interactive Callout Pins (Reference 1 & 2) */}
          <div className="browser-window" style={{ marginBottom: "2.5rem" }}>
            <div className="browser-header">
              <div className="browser-dots">
                <div className="browser-dot dot-red" />
                <div className="browser-dot dot-yellow" />
                <div className="browser-dot dot-green" />
              </div>
              <div className="browser-url-bar">
                <span>mcp://workspace/{workspace.id.substring(0, 16)}</span>
              </div>
              <div className="browser-actions">
                <Shield size={14} color="#38bdf8" />
              </div>
            </div>

            <div style={{
              padding: "3.5rem 2.5rem",
              position: "relative",
              background: "radial-gradient(ellipse at center, rgba(14, 28, 54, 0.6) 0%, rgba(7, 10, 17, 0.95) 85%)",
            }}>
              {/* Callout Pins */}
              <div className="callout-pin" style={{ top: "25px", left: "4%" }}>
                <span className="pin-icon-circle">+</span>
                <span>Zero DB/Storage Exposure</span>
              </div>

              <div className="callout-pin" style={{ top: "25px", right: "4%", animationDelay: "1.2s" }}>
                <span className="pin-icon-circle">+</span>
                <span>Context-Derived Tenant</span>
              </div>

              <div style={{ maxWidth: "700px", margin: "0 auto", textAlign: "center", position: "relative", zIndex: 5 }}>
                <div className="slash-tag" style={{ justifyContent: "center" }}>SECURITY BOUNDARY INVARIANT</div>
                <h3 className="font-editorial" style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
                  Strict Tenant Isolation Enforced
                </h3>
                <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                  Every request arriving via the Model Context Protocol (MCP) resolves workspace identity internally from your bearer credential.
                  No model or user can access cross-workspace data. Policies evaluate with strict precedence:
                  <strong style={{ color: "var(--status-deny)", marginLeft: "0.3rem" }}>Explicit DENY &gt; ALLOW</strong>.
                </p>
                <div style={{
                  padding: "0.9rem 1.25rem",
                  background: "rgba(10, 15, 27, 0.85)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "0.8rem",
                  color: "#38bdf8",
                  display: "inline-block",
                }}>
                  Claude / Agent ➔ Bearer Token ➔ PolicyEngine ➔ AnonymisationEngine ➔ Sanitized MCP Response
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FILES */}
      {/* ========================================================================= */}
      {activeTab === "files" && (
        <div>
          {/* Upload Dropzone (Reference 2 Clean Frame) */}
          <div className="frosted-panel" style={{ padding: "3rem 2rem", marginBottom: "2.5rem", textAlign: "center" }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem auto",
              color: "#38bdf8",
            }}>
              <Upload size={24} />
            </div>
            <h3 className="font-editorial" style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
              Upload Workspace Document or Dataset
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "560px", margin: "0 auto 1.75rem auto", lineHeight: 1.5 }}>
              Supported: PDF, DOCX, TXT, CSV, JSON (up to 50MB). Files are parsed, indexed, and scanned for PII immediately.
            </p>

            <label className="pill-btn pill-btn-primary" style={{ cursor: "pointer" }}>
              <Upload size={16} />
              <span>{uploading ? "Extracting & Storing..." : "Select File to Upload"}</span>
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
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ background: "rgba(10, 16, 28, 0.8)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "var(--text-secondary)" }}>Filename</th>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "var(--text-secondary)" }}>Type</th>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "var(--text-secondary)" }}>Size</th>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "var(--text-secondary)" }}>Status</th>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "var(--text-secondary)" }}>Created</th>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "var(--text-secondary)", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
                      No documents uploaded to this workspace yet.
                    </td>
                  </tr>
                ) : (
                  files.map((file) => (
                    <tr key={file.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "1.1rem 1.5rem", fontWeight: 600, color: "#f8fafc" }}>
                        {file.original_filename}
                      </td>
                      <td style={{ padding: "1.1rem 1.5rem" }}>
                        <span className="badge-status" style={{ background: "rgba(255, 255, 255, 0.06)", border: "1px solid var(--border-subtle)" }}>
                          {file.file_type}
                        </span>
                      </td>
                      <td style={{ padding: "1.1rem 1.5rem", color: "var(--text-secondary)", fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem" }}>
                        {(file.file_size / 1024).toFixed(1)} KB
                      </td>
                      <td style={{ padding: "1.1rem 1.5rem" }}>
                        <span className={`badge-status ${file.status === "READY" ? "badge-status-allow" : file.status === "FAILED" ? "badge-status-deny" : "badge-status-transform"}`}>
                          {file.status}
                        </span>
                      </td>
                      <td style={{ padding: "1.1rem 1.5rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {new Date(file.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "1.1rem 1.5rem", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => handleViewContent(file)}
                            className="pill-btn pill-btn-dark"
                            style={{ padding: "0.35rem 0.85rem", fontSize: "0.78rem" }}
                          >
                            Extracted Text
                          </button>
                          {workspace.role === "OWNER" && (
                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              className="pill-btn pill-btn-dark"
                              style={{ padding: "0.35rem 0.65rem", color: "var(--status-deny)" }}
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
            <div className="slash-tag">RESOURCE GATES</div>
            <h3 className="font-editorial" style={{ fontSize: "1.35rem", marginBottom: "0.4rem" }}>
              Resource Access Policies
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.75rem", lineHeight: 1.5 }}>
              Control read permissions on individual files or set workspace-wide defaults. Explicit DENY overrides ALLOW.
            </p>

            {workspace.role === "OWNER" && (
              <div style={{
                background: "rgba(10, 16, 28, 0.7)",
                padding: "1.25rem",
                borderRadius: "var(--radius-md)",
                marginBottom: "1.75rem",
                border: "1px solid var(--border-subtle)",
              }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.75rem", color: "var(--text-muted)" }}>
                  Add Resource Rule
                </div>
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  <select
                    className="modern-input"
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
                    className="modern-input"
                    style={{ width: "110px" }}
                    value={newResourceDecision}
                    onChange={(e) => setNewResourceDecision(e.target.value)}
                  >
                    <option value="ALLOW">ALLOW</option>
                    <option value="DENY">DENY</option>
                  </select>

                  <button onClick={handleCreateResourcePolicy} className="pill-btn pill-btn-cyan" style={{ padding: "0.55rem 1.1rem" }}>
                    Save
                  </button>
                </div>
              </div>
            )}

            <div>
              {policies.resource_policies.length === 0 ? (
                <div style={{ fontSize: "0.88rem", color: "var(--text-muted)", fontStyle: "italic", padding: "1rem 0" }}>
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
                        padding: "0.9rem 0",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#f8fafc" }}>
                          {targetFile ? targetFile.original_filename : "All Resources (Workspace Default)"}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Operation: {p.operation}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                        <span className={`badge-status ${p.decision === "ALLOW" ? "badge-status-allow" : "badge-status-deny"}`}>
                          {p.decision}
                        </span>
                        {workspace.role === "OWNER" && (
                          <button
                            onClick={() => handleDeleteResourcePolicy(p.id)}
                            style={{ color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer" }}
                          >
                            <X size={16} />
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
            <div className="slash-tag">OPERATION GATES</div>
            <h3 className="font-editorial" style={{ fontSize: "1.35rem", marginBottom: "0.4rem" }}>
              Operation Policies
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.75rem", lineHeight: 1.5 }}>
              Control which MCP operations can be executed by connected models.
            </p>

            {workspace.role === "OWNER" && (
              <div style={{
                background: "rgba(10, 16, 28, 0.7)",
                padding: "1.25rem",
                borderRadius: "var(--radius-md)",
                marginBottom: "1.75rem",
                border: "1px solid var(--border-subtle)",
              }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.75rem", color: "var(--text-muted)" }}>
                  Configure Operation Rule
                </div>
                <div style={{ display: "flex", gap: "0.6rem" }}>
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
                    style={{ width: "110px" }}
                    value={newOpDecision}
                    onChange={(e) => setNewOpDecision(e.target.value)}
                  >
                    <option value="ALLOW">ALLOW</option>
                    <option value="DENY">DENY</option>
                  </select>

                  <button onClick={handleCreateOperationPolicy} className="pill-btn pill-btn-cyan" style={{ padding: "0.55rem 1.1rem" }}>
                    Save
                  </button>
                </div>
              </div>
            )}

            <div>
              {policies.operation_policies.length === 0 ? (
                <div style={{ fontSize: "0.88rem", color: "var(--text-muted)", fontStyle: "italic", padding: "1rem 0" }}>
                  Standard read operations permitted by default.
                </div>
              ) : (
                policies.operation_policies.map((op) => (
                  <div
                    key={op.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.9rem 0",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.9rem", fontWeight: 600, color: "#f8fafc" }}>
                      {op.operation}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                      <span className={`badge-status ${op.decision === "ALLOW" ? "badge-status-allow" : "badge-status-deny"}`}>
                        {op.decision}
                      </span>
                      {workspace.role === "OWNER" && (
                        <button
                          onClick={() => handleDeleteOperationPolicy(op.id)}
                          style={{ color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer" }}
                        >
                          <X size={16} />
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
          <div className="frosted-panel" style={{ padding: "2.5rem", marginBottom: "2rem" }}>
            <div className="slash-tag">READ-TIME TRANSFORMATION</div>
            <h3 className="font-editorial" style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
              Configure Entity &amp; Field Transformation Rules
            </h3>
            <p style={{ fontSize: "0.92rem", color: "var(--text-secondary)", marginBottom: "2rem", lineHeight: 1.6, maxWidth: "700px" }}>
              Transform PII entities or specific CSV/JSON columns at query time. Raw source documents in storage remain unmodified.
            </p>

            {workspace.role === "OWNER" && (
              <div style={{
                background: "rgba(10, 16, 28, 0.7)",
                padding: "1.5rem",
                borderRadius: "var(--radius-lg)",
                marginBottom: "2.5rem",
                border: "1px solid var(--border-subtle)",
              }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "1rem", color: "var(--text-muted)" }}>
                  New Transformation Rule
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", alignItems: "flex-end" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.4rem", fontWeight: 600 }}>
                      Entity Type / Scope
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
                    <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.4rem", fontWeight: 600 }}>
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
                    <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.4rem", fontWeight: 600 }}>
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
                      className="pill-btn pill-btn-cyan"
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
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ background: "rgba(10, 16, 28, 0.8)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ padding: "0.9rem 1.25rem", color: "var(--text-secondary)" }}>Target Entity</th>
                  <th style={{ padding: "0.9rem 1.25rem", color: "var(--text-secondary)" }}>Target Field</th>
                  <th style={{ padding: "0.9rem 1.25rem", color: "var(--text-secondary)" }}>Transformation Mode</th>
                  <th style={{ padding: "0.9rem 1.25rem", color: "var(--text-secondary)" }}>Created</th>
                  <th style={{ padding: "0.9rem 1.25rem", color: "var(--text-secondary)", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {policies.anonymisation_rules.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                      No custom anonymisation rules active. Standard PII will be passed or masked per default policy.
                    </td>
                  </tr>
                ) : (
                  policies.anonymisation_rules.map((rule) => (
                    <tr key={rule.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "#f8fafc" }}>{rule.entity_type}</td>
                      <td style={{ padding: "1rem 1.25rem", color: "var(--text-secondary)", fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem" }}>
                        {rule.field_name || "All text entities"}
                      </td>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <span className={`badge-status ${rule.transformation === "ALLOW" ? "badge-status-allow" : rule.transformation === "DENY" ? "badge-status-deny" : "badge-status-transform"}`}>
                          {rule.transformation}
                        </span>
                      </td>
                      <td style={{ padding: "1rem 1.25rem", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        {new Date(rule.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "1rem 1.25rem", textAlign: "right" }}>
                        {workspace.role === "OWNER" && (
                          <button
                            onClick={() => handleDeleteAnonymisationRule(rule.id)}
                            className="pill-btn pill-btn-dark"
                            style={{ padding: "0.3rem 0.6rem", color: "var(--status-deny)" }}
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
          <div className="frosted-panel" style={{ padding: "2.5rem", marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <div className="slash-tag">CLIENT PROTOCOL ACCESS</div>
                <h3 className="font-editorial" style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
                  Model Context Protocol (MCP) Credentials
                </h3>
                <p style={{ fontSize: "0.92rem", color: "var(--text-secondary)", maxWidth: "680px", lineHeight: 1.6 }}>
                  Generate high-entropy tokens to connect AI models (Claude Desktop, Cursor, or custom agents) to this workspace.
                  The database stores only a cryptographic HMAC hash of the token.
                </p>
              </div>
              {workspace.role === "OWNER" && (
                <button onClick={() => setNewMCPModal(true)} className="pill-btn pill-btn-cyan">
                  <Plus size={15} />
                  Create New Token
                </button>
              )}
            </div>

            <div style={{
              padding: "1rem 1.25rem",
              background: "rgba(10, 16, 28, 0.7)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "0.82rem",
            }}>
              <span style={{ color: "var(--text-secondary)" }}>
                MCP Gateway Endpoint: <strong style={{ color: "#38bdf8" }}>{process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/mcp</strong>
              </span>
              <span className="badge-status badge-status-allow">JSON-RPC 2.0</span>
            </div>
          </div>

          {/* Credentials Table */}
          <div className="frosted-panel" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ background: "rgba(10, 16, 28, 0.8)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ padding: "1rem 1.25rem", color: "var(--text-secondary)" }}>Label</th>
                  <th style={{ padding: "1rem 1.25rem", color: "var(--text-secondary)" }}>Prefix Identifier</th>
                  <th style={{ padding: "1rem 1.25rem", color: "var(--text-secondary)" }}>Created</th>
                  <th style={{ padding: "1rem 1.25rem", color: "var(--text-secondary)" }}>Expires</th>
                  <th style={{ padding: "1rem 1.25rem", color: "var(--text-secondary)" }}>Status</th>
                  <th style={{ padding: "1rem 1.25rem", color: "var(--text-secondary)", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mcpCredentials.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
                      No MCP credentials generated yet. Click &quot;Create New Token&quot; to connect Claude or an AI client.
                    </td>
                  </tr>
                ) : (
                  mcpCredentials.map((cred) => (
                    <tr key={cred.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "1.1rem 1.25rem", fontWeight: 600, color: "#f8fafc" }}>{cred.name}</td>
                      <td style={{ padding: "1.1rem 1.25rem", fontFamily: "JetBrains Mono, monospace", color: "#38bdf8", fontSize: "0.85rem" }}>
                        {cred.credential_prefix}...
                      </td>
                      <td style={{ padding: "1.1rem 1.25rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {new Date(cred.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "1.1rem 1.25rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {cred.expires_at ? new Date(cred.expires_at).toLocaleDateString() : "Never"}
                      </td>
                      <td style={{ padding: "1.1rem 1.25rem" }}>
                        <span className={`badge-status ${cred.revoked_at ? "badge-status-deny" : cred.is_active ? "badge-status-allow" : "badge-status-transform"}`}>
                          {cred.revoked_at ? "Revoked" : cred.is_active ? "Active" : "Expired"}
                        </span>
                      </td>
                      <td style={{ padding: "1.1rem 1.25rem", textAlign: "right" }}>
                        {workspace.role === "OWNER" && cred.is_active && (
                          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => handleRotateMCP(cred.id)}
                              className="pill-btn pill-btn-dark"
                              style={{ padding: "0.35rem 0.85rem", fontSize: "0.78rem" }}
                            >
                              Rotate
                            </button>
                            <button
                              onClick={() => handleRevokeMCP(cred.id)}
                              className="pill-btn pill-btn-dark"
                              style={{ padding: "0.35rem 0.85rem", fontSize: "0.78rem", color: "var(--status-deny)" }}
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
            padding: "1.75rem 2rem",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}>
            <div>
              <div className="slash-tag">IMMUTABLE TRAIL</div>
              <h3 className="font-editorial" style={{ fontSize: "1.35rem" }}>Security Audit Event Log</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Cryptographically audited events. Raw secrets and raw document contents are stripped prior to persistence.
              </p>
            </div>
            <button onClick={loadWorkspaceData} className="pill-btn pill-btn-dark" style={{ padding: "0.45rem 1rem", fontSize: "0.82rem" }}>
              <RefreshCw size={13} />
              Refresh Events
            </button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "rgba(10, 16, 28, 0.8)", borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ padding: "0.9rem 1.25rem", color: "var(--text-secondary)" }}>Timestamp</th>
                <th style={{ padding: "0.9rem 1.25rem", color: "var(--text-secondary)" }}>Operation</th>
                <th style={{ padding: "0.9rem 1.25rem", color: "var(--text-secondary)" }}>Actor</th>
                <th style={{ padding: "0.9rem 1.25rem", color: "var(--text-secondary)" }}>Decision</th>
                <th style={{ padding: "0.9rem 1.25rem", color: "var(--text-secondary)" }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
                    No audit records registered yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "0.9rem 1.25rem", color: "var(--text-muted)", whiteSpace: "nowrap", fontFamily: "JetBrains Mono, monospace", fontSize: "0.78rem" }}>
                      {new Date(log.timestamp).toLocaleTimeString()} · {new Date(log.timestamp).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "0.9rem 1.25rem", fontFamily: "JetBrains Mono, monospace", fontWeight: 600, color: "#f8fafc" }}>
                      {log.operation}
                    </td>
                    <td style={{ padding: "0.9rem 1.25rem" }}>
                      <span className="badge-status" style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--border-subtle)" }}>
                        {log.actor_type}
                      </span>
                    </td>
                    <td style={{ padding: "0.9rem 1.25rem" }}>
                      <span className={`badge-status ${log.decision === "ALLOW" ? "badge-status-allow" : log.decision === "DENY" ? "badge-status-deny" : "badge-status-transform"}`}>
                        {log.decision}
                      </span>
                    </td>
                    <td style={{ padding: "0.9rem 1.25rem", color: "var(--text-secondary)", maxWidth: "300px" }}>
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
      {/* TAB 7: PLAYGROUND (Interactive MCP Terminal) */}
      {/* ========================================================================= */}
      {activeTab === "playground" && (
        <div className="frosted-panel" style={{ padding: "2.5rem" }}>
          <div className="slash-tag">INTERACTIVE TESTER</div>
          <h3 className="font-editorial" style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
            MCP JSON-RPC 2.0 Terminal
          </h3>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "2rem" }}>
            Directly invoke read-only MCP tools with your generated bearer token and inspect real-time policy filtering.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "2rem" }}>
            {/* Request Builder */}
            <div>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                  Bearer MCP Token
                </label>
                <input
                  type="text"
                  className="modern-input"
                  placeholder="mcp_live_..."
                  value={playgroundToken}
                  onChange={(e) => setPlaygroundToken(e.target.value)}
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                />
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
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

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                  Arguments (JSON)
                </label>
                <textarea
                  className="modern-input"
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem", height: "140px", resize: "vertical" }}
                  value={playgroundArgs}
                  onChange={(e) => setPlaygroundArgs(e.target.value)}
                />
              </div>

              <button
                onClick={handleExecutePlayground}
                disabled={playgroundLoading}
                className="pill-btn pill-btn-cyan"
                style={{ width: "100%", padding: "0.85rem" }}
              >
                <Terminal size={16} />
                {playgroundLoading ? "Executing Protocol Call..." : "Execute MCP Request"}
                <div className="btn-arrow-circle">
                  <ArrowRight size={12} />
                </div>
              </button>
            </div>

            {/* Response Viewer (Terminal Frame) */}
            <div className="browser-window" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div className="browser-header">
                <div className="browser-dots">
                  <div className="browser-dot dot-red" />
                  <div className="browser-dot dot-yellow" />
                  <div className="browser-dot dot-green" />
                </div>
                <div style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-muted)" }}>
                  output.json
                </div>
              </div>

              <div style={{
                flex: 1,
                padding: "1.25rem",
                background: "rgba(8, 12, 22, 0.95)",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "0.82rem",
                overflowY: "auto",
                maxHeight: "380px",
              }}>
                {playgroundResult ? (
                  <pre style={{ color: "#38bdf8" }}>{JSON.stringify(playgroundResult, null, 2)}</pre>
                ) : (
                  <div style={{ color: "var(--text-muted)", fontStyle: "italic", paddingTop: "2rem", textAlign: "center" }}>
                    Select a tool, enter valid arguments, and execute to view the JSON-RPC response.
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "2rem" }}>
          {/* Members Management */}
          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div className="slash-tag">ROLE MANAGEMENT</div>
            <h3 className="font-editorial" style={{ fontSize: "1.35rem", marginBottom: "0.5rem" }}>
              Workspace Members
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.75rem" }}>
              Manage users permitted to view or administer this workspace.
            </p>

            {workspace.role === "OWNER" && (
              <form onSubmit={handleAddMember} style={{ display: "flex", gap: "0.6rem", marginBottom: "2rem" }}>
                <input
                  type="text"
                  required
                  className="modern-input"
                  placeholder="Username to invite"
                  value={newMemberUsername}
                  onChange={(e) => setNewMemberUsername(e.target.value)}
                />
                <select
                  className="modern-input"
                  style={{ width: "130px" }}
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="OWNER">OWNER</option>
                </select>
                <button type="submit" className="pill-btn pill-btn-cyan" style={{ padding: "0.55rem 1.25rem" }}>
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
                    padding: "0.9rem 0",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#f8fafc" }}>{m.username || m.user_id}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Joined {new Date(m.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                    <span className="badge-status badge-status-transform">{m.role}</span>
                    {workspace.role === "OWNER" && m.user_id !== workspace.owner_id && (
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        style={{ color: "var(--status-deny)", background: "transparent", border: "none", cursor: "pointer" }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="frosted-panel" style={{ padding: "2rem", border: "1px solid rgba(244, 63, 94, 0.35)" }}>
            <div className="slash-tag" style={{ color: "var(--status-deny)" }}>IRREVERSIBLE ACTION</div>
            <h3 className="font-editorial" style={{ fontSize: "1.35rem", color: "var(--status-deny)", marginBottom: "0.5rem" }}>
              Delete Workspace
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "2rem", lineHeight: 1.6 }}>
              Permanently delete this workspace. All associated documents, extracted texts, policies, and MCP credentials will be irreversibly removed.
            </p>

            {workspace.role === "OWNER" ? (
              <button
                onClick={handleDeleteWorkspace}
                className="pill-btn pill-btn-dark"
                style={{ background: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.4)", color: "#f43f5e" }}
              >
                <Trash2 size={16} />
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
      {/* MODAL: VIEW EXTRACTED CONTENT (Reference 3 Frosted Panel) */}
      {/* ========================================================================= */}
      {selectedFileContent && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(3, 7, 18, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 150,
          padding: "1.5rem",
        }}>
          <div className="frosted-panel frosted-panel-highlight" style={{
            width: "100%",
            maxWidth: "850px",
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
            padding: "2.5rem",
            position: "relative",
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.8)",
            borderRadius: "var(--radius-xl)",
          }}>
            <button
              onClick={() => setSelectedFileContent(null)}
              style={{
                position: "absolute",
                top: "1.5rem",
                right: "1.5rem",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>

            <div className="slash-tag">PARSED VAULT DOCUMENT</div>
            <h3 className="font-editorial" style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
              {selectedFileName}
            </h3>

            <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1.25rem" }}>
              <span className="badge-status badge-status-allow">Zero Storage Exposure</span>
              <span className="badge-status badge-status-transform">
                Detected PII: {selectedFileContent.detected_entities?.length || 0}
              </span>
            </div>

            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "1.25rem",
              background: "rgba(10, 16, 28, 0.85)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "0.82rem",
              lineHeight: 1.6,
              color: "#e2e8f0",
              whiteSpace: "pre-wrap",
              marginBottom: "1.5rem",
            }}>
              {selectedFileContent.plain_text}
            </div>

            {selectedFileContent.detected_entities && selectedFileContent.detected_entities.length > 0 && (
              <div style={{
                maxHeight: "130px",
                overflowY: "auto",
                background: "rgba(10, 16, 28, 0.5)",
                padding: "0.9rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                  Detected PII Entities:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
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
          background: "rgba(3, 7, 18, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 150,
          padding: "1.5rem",
        }}>
          <div className="frosted-panel frosted-panel-highlight" style={{
            width: "100%",
            maxWidth: "480px",
            padding: "2.75rem 2.5rem",
            position: "relative",
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.8)",
            borderRadius: "var(--radius-xl)",
          }}>
            <button
              onClick={() => setNewMCPModal(false)}
              style={{
                position: "absolute",
                top: "1.5rem",
                right: "1.5rem",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>

            <div className="slash-tag">NEW CREDENTIAL</div>
            <h3 className="font-editorial" style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>
              Generate MCP Token
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.75rem", lineHeight: 1.5 }}>
              Generates a cryptographically random, high-entropy token. The raw secret is returned ONCE and never stored.
            </p>

            <form onSubmit={handleCreateMCPCredential}>
              <div style={{ marginBottom: "2rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                  Credential Label
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="modern-input"
                  placeholder="e.g. Claude Desktop or Production Agent"
                  value={newMCPName}
                  onChange={(e) => setNewMCPName(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button type="button" onClick={() => setNewMCPModal(false)} className="pill-btn pill-btn-dark">
                  Cancel
                </button>
                <button type="submit" className="pill-btn pill-btn-cyan">
                  <Key size={15} />
                  Generate Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ONE-TIME TOKEN REVEAL (Reference 3 High-Tech Glass Panel) */}
      {/* ========================================================================= */}
      {createdCredential && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(3, 7, 18, 0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 200,
          padding: "1.5rem",
        }}>
          <div className="frosted-panel frosted-panel-highlight" style={{
            width: "100%",
            maxWidth: "680px",
            padding: "3rem 2.5rem",
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.9), 0 0 45px rgba(56, 189, 248, 0.25)",
            borderRadius: "var(--radius-xl)",
          }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div className="slash-tag" style={{ justifyContent: "center" }}>CONFIDENTIAL ONE-TIME SECRET</div>
              <h3 className="font-editorial" style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>
                Save Your Private MCP Token
              </h3>
              <p style={{
                fontSize: "0.85rem",
                color: "var(--status-deny)",
                background: "var(--status-deny-bg)",
                padding: "0.6rem 1rem",
                borderRadius: "var(--radius-pill)",
                display: "inline-block",
                border: "1px solid rgba(244, 63, 94, 0.35)",
              }}>
                ⚠️ This secret will NEVER be shown again. Store it securely in your client config.
              </p>
            </div>

            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Raw Private MCP Token
              </div>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <input
                  type="text"
                  readOnly
                  value={createdCredential.raw_token}
                  className="modern-input"
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem", color: "#38bdf8" }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdCredential.raw_token);
                    setCopiedToken(true);
                    notify("success", "Token copied to clipboard!");
                    setTimeout(() => setCopiedToken(false), 2500);
                  }}
                  className="pill-btn pill-btn-primary"
                  style={{ padding: "0 1.25rem" }}
                >
                  {copiedToken ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedToken ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Claude Desktop Config Generator */}
            <div style={{ marginBottom: "2rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Claude Desktop Configuration (`claude_desktop_config.json`)
              </div>
              <div style={{
                padding: "1rem 1.25rem",
                background: "rgba(8, 12, 22, 0.95)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "0.78rem",
                overflowX: "auto",
                color: "#e2e8f0",
              }}>
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
              className="pill-btn pill-btn-cyan"
              style={{ width: "100%", padding: "0.85rem" }}
            >
              I Have Securely Saved This Token
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
