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
  Share2,
  Sparkles,
  CheckSquare,
  Square,
  Lock,
} from "lucide-react";

export default function WorkspaceDetailPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const router = useRouter();

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    "documents" | "links" | "privacy" | "activity" | "playground" | "settings"
  >("documents");

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
  const [createdCredential, setCreatedCredential] = useState<MCPCredentialCreated | null>(null);
  const [newMemberUsername, setNewMemberUsername] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("MEMBER");

  // Simplified 3-Step Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<1 | 2 | 3>(1);

  // Simplified "Share MCP Link" Wizard State
  const [shareWizardOpen, setShareWizardOpen] = useState(false);
  const [shareStep, setShareStep] = useState<1 | 2 | 3>(1);
  const [shareName, setShareName] = useState("Claude Assistant");
  const [shareAllFiles, setShareAllFiles] = useState(true);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [maskEmails, setMaskEmails] = useState(true);
  const [maskNames, setMaskNames] = useState(false);
  const [maskSSN, setMaskSSN] = useState(true);
  const [customColumnsToHide, setCustomColumnsToHide] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);

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
      // Default file selection in share wizard
      setSelectedFileIds(fList.map((f) => f.id));
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

  // Simplified File Upload Flow
  const handleExecuteUpload = async () => {
    if (!uploadFile) return;

    setUploading(true);
    try {
      const uploaded = await api.uploadFile(workspaceId, uploadFile);
      notify("success", `File '${uploadFile.name}' processed successfully.`);
      // Update files state immediately
      setFiles((prev) => [uploaded, ...prev]);
      setUploadModalOpen(false);
      setUploadFile(null);
      setUploadDescription("");
      setUploadStep(1);
    } catch (err: any) {
      notify("error", err.message || "Upload failed");
    } finally {
      setUploading(false);
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
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err: any) {
      notify("error", err.message || "Failed to delete file");
    }
  };

  // Simplified Share / Create MCP Link Flow
  const handleGenerateShareLink = async () => {
    if (!shareName.trim()) return;

    setGeneratingLink(true);
    try {
      // 1. Create the MCP Token
      const created = await api.createMCPCredential(workspaceId, shareName.trim());

      // 2. Set file-level restrictions if not sharing all files
      if (!shareAllFiles && selectedFileIds.length > 0) {
        // Explicitly deny files not in selected list
        const excludedFiles = files.filter((f) => !selectedFileIds.includes(f.id));
        for (const file of excludedFiles) {
          try {
            await api.createResourcePolicy(workspaceId, file.id, "read_resource", "DENY");
          } catch (e) {}
        }
      }

      // 3. Set privacy / anonymisation rules
      if (maskEmails) {
        try {
          await api.createAnonymisationRule(workspaceId, "email", null, "MASK");
        } catch (e) {}
      }
      if (maskNames) {
        try {
          await api.createAnonymisationRule(workspaceId, "person_name", null, "PSEUDONYMIZE");
        } catch (e) {}
      }
      if (maskSSN) {
        try {
          await api.createAnonymisationRule(workspaceId, "ssn", null, "MASK");
        } catch (e) {}
      }
      if (customColumnsToHide.trim()) {
        const columns = customColumnsToHide.split(",").map((c) => c.trim()).filter(Boolean);
        for (const col of columns) {
          try {
            await api.createAnonymisationRule(workspaceId, "custom_column", col, "REMOVE");
          } catch (e) {}
        }
      }

      // Update state immediately
      setMCPCredentials((prev) => [
        {
          id: created.id,
          workspace_id: created.workspace_id,
          name: created.name,
          credential_prefix: created.credential_prefix,
          created_at: created.created_at,
          expires_at: created.expires_at,
          last_used_at: null,
          revoked_at: null,
          is_active: true,
        },
        ...prev,
      ]);

      const updatedPolicies = await api.getPolicies(workspaceId);
      setPolicies(updatedPolicies);

      setCreatedCredential(created);
      setPlaygroundToken(created.raw_token);
      setShareWizardOpen(false);
      setShareStep(1);
      setShareName("Claude Assistant");
      notify("success", "Shareable MCP Link generated!");
    } catch (err: any) {
      notify("error", err.message || "Failed to generate link");
    } finally {
      setGeneratingLink(false);
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
    if (!confirm("Revoking will immediately disable this link. Continue?")) return;
    try {
      await api.revokeMCPCredential(workspaceId, credentialId);
      notify("success", "Link revoked.");
      setMCPCredentials((prev) =>
        prev.map((c) => (c.id === credentialId ? { ...c, is_active: false, revoked_at: new Date().toISOString() } : c))
      );
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const member = await api.addMember(workspaceId, newMemberUsername.trim(), newMemberRole);
      notify("success", `Added user '${newMemberUsername}'.`);
      setMembers((prev) => [...prev, member]);
      setNewMemberUsername("");
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await api.removeMember(workspaceId, memberId);
      notify("success", "Member removed.");
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
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

      {/* Header Banner: Clean Typography & MAIN COLORFUL ACTION BUTTONS */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2rem",
        paddingBottom: "1.75rem",
        borderBottom: "1px solid var(--border-card)",
        flexWrap: "wrap",
        gap: "1.5rem",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
            <Link href="/dashboard" className="slash-tag" style={{ textDecoration: "none", margin: 0 }}>
              WORKSPACES
            </Link>
            <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>/</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
              {workspace.name}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <h1 className="font-editorial" style={{ fontSize: "clamp(1.7rem, 2.5vw, 2.2rem)", letterSpacing: "-0.02em" }}>
              {workspace.name}
            </h1>
            <span className={`badge-status ${workspace.is_active ? "badge-status-allow" : "badge-status-deny"}`}>
              {workspace.is_active ? "Active" : "Disabled"}
            </span>
          </div>
        </div>

        {/* 🌟 THE TWO MAIN HIGHLIGHTED BUTTONS 🌟 */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
          {/* Button 1: Upload Document */}
          <button
            onClick={() => {
              setUploadFile(null);
              setUploadDescription("");
              setUploadStep(1);
              setUploadModalOpen(true);
            }}
            className="pill-btn pill-btn-primary"
            style={{
              padding: "0.7rem 1.4rem",
              fontSize: "0.92rem",
              background: "#0f172a",
              color: "#ffffff",
              boxShadow: "0 4px 14px rgba(15, 23, 42, 0.2)",
            }}
          >
            <Upload size={16} />
            <span>Upload Document</span>
          </button>

          {/* Button 2: Share MCP Link */}
          <button
            onClick={() => {
              setSelectedFileIds(files.map((f) => f.id));
              setShareStep(1);
              setShareWizardOpen(true);
            }}
            className="pill-btn pill-btn-blue"
            style={{
              padding: "0.7rem 1.4rem",
              fontSize: "0.92rem",
              background: "#2563eb",
              color: "#ffffff",
              boxShadow: "0 4px 16px rgba(37, 99, 235, 0.28)",
            }}
          >
            <Share2 size={16} />
            <span>Share MCP Link</span>
          </button>
        </div>
      </div>

      {/* Simplified, Plain-Language Navigation Tabs */}
      <div style={{ marginBottom: "2rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
        <div className="pill-tabs-bar" style={{ display: "flex", flexWrap: "nowrap" }}>
          {[
            { id: "documents", label: `Documents (${files.length})`, icon: <FileText size={15} /> },
            { id: "links", label: `AI Links (${mcpCredentials.length})`, icon: <Key size={15} /> },
            { id: "privacy", label: `Privacy Rules (${policies.resource_policies.length + policies.anonymisation_rules.length})`, icon: <Shield size={15} /> },
            { id: "activity", label: `Activity Trail (${auditLogs.length})`, icon: <ScrollText size={15} /> },
            { id: "playground", label: "Test Console", icon: <Terminal size={15} /> },
            { id: "settings", label: "Settings", icon: <Settings size={15} /> },
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
      {/* TAB 1: DOCUMENTS (DEFAULT & CLEAN) */}
      {/* ========================================================================= */}
      {activeTab === "documents" && (
        <div>
          {files.length === 0 ? (
            <div className="frosted-panel" style={{ textAlign: "center", padding: "4.5rem 2rem" }}>
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.25rem auto",
                color: "#0f172a",
              }}>
                <FileText size={28} />
              </div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                No documents uploaded yet
              </h3>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "460px", margin: "0 auto 1.75rem auto", lineHeight: 1.5 }}>
                Upload PDF reports, CSV data tables, or text files. AI models can safely query them using your privacy rules.
              </p>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="pill-btn pill-btn-primary"
              >
                <Upload size={15} />
                Upload Your First Document
              </button>
            </div>
          ) : (
            <div className="frosted-panel" style={{ overflow: "hidden" }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Status</th>
                    <th>Uploaded</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id}>
                      <td style={{ fontWeight: 600, color: "#0f172a" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <FileText size={16} color="#2563eb" />
                          <span>{file.original_filename}</span>
                        </div>
                      </td>
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
                          {file.status === "READY" ? "Ready for AI" : file.status}
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
                            style={{ padding: "0.35rem 0.85rem", fontSize: "0.78rem" }}
                          >
                            View Extracted Content
                          </button>
                          {workspace.role === "OWNER" && (
                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              className="pill-btn pill-btn-dark"
                              style={{ padding: "0.35rem 0.65rem", color: "var(--status-deny)" }}
                              title="Delete file"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI LINKS (MULTI-MCP SHARING LINKS) */}
      {/* ========================================================================= */}
      {activeTab === "links" && (
        <div>
          <div className="frosted-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <div className="slash-tag">AI CONNECTIONS</div>
                <h3 className="font-editorial" style={{ fontSize: "1.35rem", marginBottom: "0.35rem" }}>
                  Active MCP Sharing Links
                </h3>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", maxWidth: "660px", lineHeight: 1.5 }}>
                  You can create as many links as you want. Each link can have access to specific documents and custom privacy rules.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedFileIds(files.map((f) => f.id));
                  setShareStep(1);
                  setShareWizardOpen(true);
                }}
                className="pill-btn pill-btn-blue"
              >
                <Plus size={15} />
                Create New MCP Link
              </button>
            </div>
          </div>

          <div className="frosted-panel" style={{ overflow: "hidden" }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Link Name / Agent</th>
                  <th>Key Identifier</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mcpCredentials.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "3.5rem", color: "var(--text-muted)" }}>
                      No links created yet. Click &quot;Create New MCP Link&quot; above to connect Claude Desktop or an AI agent.
                    </td>
                  </tr>
                ) : (
                  mcpCredentials.map((cred) => (
                    <tr key={cred.id}>
                      <td style={{ fontWeight: 600, color: "#0f172a" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <Key size={15} color="#2563eb" />
                          <span>{cred.name}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem", color: "#2563eb" }}>
                        {cred.credential_prefix}...
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        {new Date(cred.created_at).toLocaleDateString()}
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
                              Rotate Key
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
      {/* TAB 3: PRIVACY RULES & POLICIES */}
      {/* ========================================================================= */}
      {activeTab === "privacy" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "2rem" }}>
          {/* Anonymisation Rules */}
          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div className="slash-tag">DATA MASKING</div>
            <h3 className="font-editorial" style={{ fontSize: "1.25rem", marginBottom: "0.35rem" }}>
              Active Anonymisation Rules
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              These rules mask sensitive data before AI models receive query results.
            </p>

            <div>
              {policies.anonymisation_rules.length === 0 ? (
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", padding: "1rem 0" }}>
                  No active masking rules.
                </div>
              ) : (
                policies.anonymisation_rules.map((rule) => (
                  <div
                    key={rule.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.75rem 0",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{rule.entity_type}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {rule.field_name ? `Field: ${rule.field_name}` : "All occurrences"}
                      </div>
                    </div>
                    <span className="badge-status badge-status-transform">
                      {rule.transformation}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Document Access Restrictions */}
          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div className="slash-tag">DOCUMENT ACCESS</div>
            <h3 className="font-editorial" style={{ fontSize: "1.25rem", marginBottom: "0.35rem" }}>
              File Permissions
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Restrictions placed on individual files or workspace resources.
            </p>

            <div>
              {policies.resource_policies.length === 0 ? (
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", padding: "1rem 0" }}>
                  All uploaded files are accessible to authorized AI tokens.
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
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                        {targetFile ? targetFile.original_filename : "All Files (Default)"}
                      </div>
                      <span className={`badge-status ${p.decision === "ALLOW" ? "badge-status-allow" : "badge-status-deny"}`}>
                        {p.decision}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ACTIVITY TRAIL */}
      {/* ========================================================================= */}
      {activeTab === "activity" && (
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
              <div className="slash-tag">AUDIT TRAIL</div>
              <h3 className="font-editorial" style={{ fontSize: "1.25rem" }}>Activity &amp; Query Log</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                Every tool call and data request is logged securely without exposing private secrets.
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
                <th>Caller</th>
                <th>Decision</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "3.5rem", color: "var(--text-muted)" }}>
                    No activity recorded yet.
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
                      <span className={`badge-status ${log.decision === "ALLOW" ? "badge-status-allow" : "badge-status-deny"}`}>
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
      {/* TAB 5: TEST CONSOLE (PLAYGROUND) */}
      {/* ========================================================================= */}
      {activeTab === "playground" && (
        <div className="frosted-panel" style={{ padding: "2rem" }}>
          <div className="slash-tag">DEVELOPER CONSOLE</div>
          <h3 className="font-editorial" style={{ fontSize: "1.35rem", marginBottom: "0.35rem" }}>
            MCP Tool Test Console
          </h3>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.75rem" }}>
            Test live JSON-RPC requests directly against your MCP gateway.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.75rem" }}>
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
                {playgroundLoading ? "Running..." : "Run MCP Request"}
              </button>
            </div>

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
                    Results from the MCP gateway will appear here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === "settings" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "2rem" }}>
          {/* Members */}
          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div className="slash-tag">TEAM MEMBERS</div>
            <h3 className="font-editorial" style={{ fontSize: "1.25rem", marginBottom: "0.35rem" }}>
              Workspace Access
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Share this workspace with colleagues by username.
            </p>

            {workspace.role === "OWNER" && (
              <form onSubmit={handleAddMember} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.75rem" }}>
                <input
                  type="text"
                  required
                  className="modern-input"
                  placeholder="Username"
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
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Permanently delete this workspace and all associated files.
            </p>

            {workspace.role === "OWNER" && (
              <button
                onClick={handleDeleteWorkspace}
                className="pill-btn pill-btn-dark"
                style={{ color: "var(--status-deny)", borderColor: "#fecaca" }}
              >
                <Trash2 size={14} />
                Delete Workspace Permanently
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ✨ SIMPLIFIED 3-STEP UPLOAD MODAL ✨ */}
      {/* ========================================================================= */}
      {uploadModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.5)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 150,
          padding: "1.5rem",
        }}>
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: "520px",
            padding: "2.5rem 2.25rem",
            position: "relative",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius-xl)",
          }}>
            <button
              onClick={() => setUploadModalOpen(false)}
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

            <div className="slash-tag">EASY UPLOAD</div>
            <h2 className="font-editorial" style={{ fontSize: "1.6rem", marginBottom: "0.4rem" }}>
              Upload Document to Workspace
            </h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.75rem", lineHeight: 1.5 }}>
              Follow 3 simple steps to add files for your AI agents to query.
            </p>

            {/* Step 1: File selection */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#0f172a", color: "#fff", fontSize: "0.75rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  1
                </span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-primary)" }}>
                  Choose Your File
                </span>
              </div>

              {!uploadFile ? (
                <label style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "2rem",
                  border: "2px dashed var(--border-card)",
                  borderRadius: "var(--radius-md)",
                  background: "#f8fafc",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}>
                  <Upload size={24} color="#2563eb" style={{ marginBottom: "0.5rem" }} />
                  <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#0f172a" }}>
                    Click to browse or drag file here
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    PDF, CSV, TXT, DOCX, JSON (up to 50MB)
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.csv,.json"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                    style={{ display: "none" }}
                  />
                </label>
              ) : (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.85rem 1rem",
                  background: "#f1f5f9",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-card)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <FileText size={18} color="#2563eb" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#0f172a" }}>{uploadFile.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{(uploadFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setUploadFile(null)}
                    style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Description for AI */}
            <div style={{ marginBottom: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#0f172a", color: "#fff", fontSize: "0.75rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  2
                </span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-primary)" }}>
                  Add Description for AI (Optional)
                </span>
              </div>
              <textarea
                className="modern-input"
                placeholder="e.g. Q3 Sales Data - AI can use this for revenue calculations and customer summaries."
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                style={{ height: "70px", resize: "none", fontSize: "0.85rem" }}
              />
            </div>

            {/* Step 3: Upload Action */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="pill-btn pill-btn-dark"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!uploadFile || uploading}
                onClick={handleExecuteUpload}
                className="pill-btn pill-btn-primary"
              >
                {uploading ? "Processing Document..." : "Upload & Save"}
                <div className="btn-arrow-circle">
                  <ArrowRight size={12} />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ✨ MULTI-LINK "SHARE MCP LINK" WIZARD ✨ */}
      {/* ========================================================================= */}
      {shareWizardOpen && (
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
          zIndex: 160,
          padding: "1.5rem",
        }}>
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: "560px",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "2.5rem 2.25rem",
            position: "relative",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius-xl)",
          }}>
            <button
              onClick={() => setShareWizardOpen(false)}
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

            <div className="slash-tag">MCP LINK GENERATOR</div>
            <h2 className="font-editorial" style={{ fontSize: "1.6rem", marginBottom: "0.35rem" }}>
              Create Tailored MCP Link
            </h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.75rem", lineHeight: 1.5 }}>
              Configure exactly which files and data this AI link can access.
            </p>

            {/* Wizard Step 1: Name */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-primary)" }}>
                1. Link Label / Purpose
              </label>
              <input
                type="text"
                className="modern-input"
                placeholder="e.g. Claude Support Bot or Finance Auditor"
                value={shareName}
                onChange={(e) => setShareName(e.target.value)}
              />
            </div>

            {/* Wizard Step 2: Choose which files */}
            <div style={{ marginBottom: "1.75rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                2. Which files can this AI access?
              </label>

              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShareAllFiles(true);
                    setSelectedFileIds(files.map((f) => f.id));
                  }}
                  className={`pill-tab ${shareAllFiles ? "active" : ""}`}
                  style={{ fontSize: "0.8rem", padding: "0.35rem 0.9rem" }}
                >
                  All Documents ({files.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShareAllFiles(false)}
                  className={`pill-tab ${!shareAllFiles ? "active" : ""}`}
                  style={{ fontSize: "0.8rem", padding: "0.35rem 0.9rem" }}
                >
                  Choose Specific Files
                </button>
              </div>

              {!shareAllFiles && (
                <div style={{
                  maxHeight: "140px",
                  overflowY: "auto",
                  background: "#f8fafc",
                  padding: "0.75rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-card)",
                }}>
                  {files.length === 0 ? (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No files uploaded yet.</div>
                  ) : (
                    files.map((f) => {
                      const isChecked = selectedFileIds.includes(f.id);
                      return (
                        <div
                          key={f.id}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedFileIds(selectedFileIds.filter((id) => id !== f.id));
                            } else {
                              setSelectedFileIds([...selectedFileIds, f.id]);
                            }
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            padding: "0.4rem 0",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            color: "#0f172a",
                          }}
                        >
                          {isChecked ? <CheckSquare size={16} color="#2563eb" /> : <Square size={16} color="#94a3b8" />}
                          <span style={{ fontWeight: isChecked ? 600 : 400 }}>{f.original_filename}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Wizard Step 3: Privacy & Data Masking */}
            <div style={{ marginBottom: "2rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.6rem", color: "var(--text-primary)" }}>
                3. Privacy &amp; Data Masking for this Link
              </label>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={maskEmails}
                    onChange={(e) => setMaskEmails(e.target.checked)}
                    style={{ accentColor: "#2563eb", width: "16px", height: "16px" }}
                  />
                  <span>Mask Email Addresses (e.g. <code>j***@example.com</code>)</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={maskNames}
                    onChange={(e) => setMaskNames(e.target.checked)}
                    style={{ accentColor: "#2563eb", width: "16px", height: "16px" }}
                  />
                  <span>Pseudonymize Person Names (e.g. <code>Person_001</code>)</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={maskSSN}
                    onChange={(e) => setMaskSSN(e.target.checked)}
                    style={{ accentColor: "#2563eb", width: "16px", height: "16px" }}
                  />
                  <span>Mask Social Security Numbers (SSN)</span>
                </label>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.3rem", fontWeight: 600 }}>
                  Hide specific columns (comma-separated):
                </label>
                <input
                  type="text"
                  className="modern-input"
                  placeholder="e.g. salary, credit_card, ssn"
                  value={customColumnsToHide}
                  onChange={(e) => setCustomColumnsToHide(e.target.value)}
                  style={{ fontSize: "0.82rem" }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setShareWizardOpen(false)}
                className="pill-btn pill-btn-dark"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={generatingLink || !shareName.trim()}
                onClick={handleGenerateShareLink}
                className="pill-btn pill-btn-blue"
              >
                <Key size={14} />
                <span>{generatingLink ? "Creating Link..." : "Generate Shareable Link"}</span>
              </button>
            </div>
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
              <span className="badge-status badge-status-allow">Indexed</span>
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
                  Detected Entities in Document:
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
              <div className="slash-tag" style={{ justifyContent: "center" }}>MCP LINK READY</div>
              <h3 className="font-editorial" style={{ fontSize: "1.6rem", marginBottom: "0.4rem" }}>
                Your Shareable MCP Token
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
                Copy this token now. It cannot be recovered after closing this window.
              </p>
            </div>

            {/* Claude.ai Web Remote Connector Direct URL */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "#2563eb", marginBottom: "0.4rem" }}>
                1. Claude.ai Web Remote Connector URL (Includes Token)
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  readOnly
                  value={`${process.env.NEXT_PUBLIC_API_URL || "https://dbmcp.onrender.com"}/mcp?token=${createdCredential.raw_token}`}
                  className="modern-input"
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem", borderColor: "#bfdbfe", background: "#f0f7ff" }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_API_URL || "https://dbmcp.onrender.com"}/mcp?token=${createdCredential.raw_token}`);
                    notify("success", "Claude.ai Connector URL copied!");
                  }}
                  className="pill-btn pill-btn-blue"
                  style={{ padding: "0 1.15rem" }}
                >
                  <Copy size={15} />
                  <span>Copy for Claude.ai</span>
                </button>
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Paste this into Claude.ai with <strong>Authentication: None</strong> to connect directly and securely!
              </div>
            </div>

            {/* Copyable Bearer Token */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                2. Bearer Authentication Token
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
                  className="pill-btn pill-btn-dark"
                  style={{ padding: "0 1.15rem" }}
                >
                  {copiedToken ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copiedToken ? "Copied" : "Copy Token"}</span>
                </button>
              </div>
            </div>

            {/* Claude Desktop Config Snippet */}
            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                3. Claude Desktop / Cursor JSON Config
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
