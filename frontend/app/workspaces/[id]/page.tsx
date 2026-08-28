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
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Share2,
  CheckSquare,
  Square,
  Lock,
  Sliders,
  Database,
  Table,
  Filter,
  Eye,
  Columns,
  Sparkles,
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

  // 🌟 Advanced Power Query / Excel Spreadsheet "Share MCP Link" Wizard State 🌟
  const [shareWizardOpen, setShareWizardOpen] = useState(false);
  const [shareStep, setShareStep] = useState<1 | 2>(1);
  const [shareName, setShareName] = useState("Claude Assistant");
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  
  // Power Query Transformation States (Only for Tabular Data Files: CSV, Excel, JSON)
  const [activeTransformFileId, setActiveTransformFileId] = useState<string>("");
  const [selectedColumnName, setSelectedColumnName] = useState<string>("email");
  const [customColumnsToHide, setCustomColumnsToHide] = useState("");
  const [columnActions, setColumnActions] = useState<Record<string, "KEEP" | "MASK" | "REMOVE">>({
    email: "MASK",
    ssn: "MASK",
    salary: "REMOVE",
    credit_card: "REMOVE",
    customer_id: "KEEP",
    region: "KEEP",
  });
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
      setSelectedFileIds(fList.map((f) => f.id));
      
      const firstDataFile = fList.find((f) => isDataFile(f));
      if (firstDataFile) {
        setActiveTransformFileId(firstDataFile.id);
      } else if (fList.length > 0) {
        setActiveTransformFileId(fList[0].id);
      }
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

  // Helper to distinguish tabular data files from non-data documents
  const isDataFile = (file: FileRecord) => {
    const ext = file.original_filename.toLowerCase();
    return (
      file.file_type === "CSV" ||
      file.file_type === "JSON" ||
      ext.endsWith(".csv") ||
      ext.endsWith(".xlsx") ||
      ext.endsWith(".xls") ||
      ext.endsWith(".json")
    );
  };

  // File Upload Flow
  const handleExecuteUpload = async () => {
    if (!uploadFile) return;

    setUploading(true);
    try {
      const uploaded = await api.uploadFile(workspaceId, uploadFile);
      notify("success", `File '${uploadFile.name}' processed successfully.`);
      setFiles((prev) => [uploaded, ...prev]);
      setSelectedFileIds((prev) => [...prev, uploaded.id]);
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
      setSelectedFileIds((prev) => prev.filter((id) => id !== fileId));
    } catch (err: any) {
      notify("error", err.message || "Failed to delete file");
    }
  };

  // Generate MCP Link with Power Query & Document Policies
  const handleGenerateShareLink = async () => {
    if (!shareName.trim()) return;

    setGeneratingLink(true);
    try {
      const created = await api.createMCPCredential(workspaceId, shareName.trim());

      // 1. Enforce excluded files if any
      const excludedFiles = files.filter((f) => !selectedFileIds.includes(f.id));
      for (const file of excludedFiles) {
        try {
          await api.createResourcePolicy(workspaceId, file.id, "read_resource", "DENY");
        } catch (e) {}
      }

      // 2. Power Query Column Transformations (Only applied if tabular data files are shared)
      const hasDataFilesSelected = files.filter((f) => selectedFileIds.includes(f.id)).some(isDataFile);
      if (hasDataFilesSelected) {
        for (const [col, action] of Object.entries(columnActions)) {
          if (action === "REMOVE") {
            try {
              await api.createAnonymisationRule(workspaceId, "custom_column", col, "REMOVE");
            } catch (e) {}
          } else if (action === "MASK") {
            try {
              await api.createAnonymisationRule(workspaceId, "custom_column", col, "MASK");
            } catch (e) {}
          }
        }

        if (customColumnsToHide.trim()) {
          const columns = customColumnsToHide.split(",").map((c) => c.trim()).filter(Boolean);
          for (const col of columns) {
            try {
              await api.createAnonymisationRule(workspaceId, "custom_column", col, "REMOVE");
            } catch (e) {}
          }
        }
      }

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
      notify("success", "Shareable ABOX MCP Link generated!");
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

  const selectedFiles = files.filter((f) => selectedFileIds.includes(f.id));
  const selectedDataFiles = selectedFiles.filter(isDataFile);
  const hasDataFilesSelected = selectedDataFiles.length > 0;
  const activeTransformFile = selectedDataFiles.find((f) => f.id === activeTransformFileId) || selectedDataFiles[0];

  // Available Columns for Dataset Transformation
  const availableColumns = [
    { name: "customer_id", letter: "A", type: "string", sample: ["CUST_101", "CUST_102", "CUST_103", "CUST_104"] },
    { name: "email", letter: "B", type: "email", sample: ["alex@corp.com", "maya@corp.com", "david@corp.com", "sarah@corp.com"] },
    { name: "ssn", letter: "C", type: "tax_id", sample: ["458-12-9011", "291-88-3402", "994-10-8812", "112-90-4820"] },
    { name: "salary", letter: "D", type: "currency", sample: ["$95,000", "$120,000", "$85,000", "$140,000"] },
    { name: "region", letter: "E", type: "string", sample: ["North America", "Europe", "Asia-Pacific", "Latin America"] },
  ];

  return (
    <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "clamp(1.5rem, 3vw, 2.5rem) clamp(1rem, 3vw, 1.5rem) 5rem clamp(1rem, 3vw, 1.5rem)" }}>
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          zIndex: 200,
          background: notification.type === "success" ? "var(--color-obsidian)" : "#dc2626",
          color: "#ffffff",
          padding: "0.75rem 1.25rem",
          borderRadius: "var(--radius-pill)",
          boxShadow: "var(--shadow-lg)",
          fontWeight: 500,
          fontSize: "0.85rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          maxWidth: "calc(100vw - 4rem)",
        }}>
          {notification.type === "success" ? <ShieldCheck size={16} color="#4ade80" /> : <AlertTriangle size={16} />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header Banner: Clean Typography & MAIN ACTION BUTTONS */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2.5rem",
        paddingBottom: "1.5rem",
        borderBottom: "1px solid var(--glass-border-subtle)",
        flexWrap: "wrap",
        gap: "1.25rem",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.3rem" }}>
            <Link href="/dashboard" className="slash-tag" style={{ textDecoration: "none", margin: 0 }}>
              WORKSPACES
            </Link>
            <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>/</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
              {workspace.name}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <h1 className="font-hero" style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", letterSpacing: "-0.025em", color: "var(--color-obsidian)" }}>
              {workspace.name}
            </h1>
            <span className={`badge-status ${workspace.is_active ? "badge-status-allow" : "badge-status-deny"}`}>
              {workspace.is_active ? "Active Vault" : "Disabled"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setUploadFile(null);
              setUploadDescription("");
              setUploadStep(1);
              setUploadModalOpen(true);
            }}
            className="pill-btn pill-btn-glass"
            style={{ padding: "0.65rem 1.25rem", fontSize: "0.88rem" }}
          >
            <Upload size={15} />
            <span>Upload Document</span>
          </button>

          <button
            onClick={() => {
              setSelectedFileIds(files.map((f) => f.id));
              setShareStep(1);
              const firstDataFile = files.find(isDataFile);
              if (firstDataFile) {
                setActiveTransformFileId(firstDataFile.id);
              }
              setShareWizardOpen(true);
            }}
            className="pill-btn pill-btn-solid"
            style={{ padding: "0.65rem 1.25rem", fontSize: "0.88rem" }}
          >
            <Share2 size={15} />
            <span>Share MCP Link</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: "2rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
        <div className="pill-tabs-bar" style={{ display: "flex", flexWrap: "nowrap" }}>
          {[
            { id: "documents", label: `Documents (${files.length})`, icon: <FileText size={14} /> },
            { id: "links", label: `AI Links (${mcpCredentials.length})`, icon: <Key size={14} /> },
            { id: "privacy", label: `Privacy Rules (${policies.resource_policies.length + policies.anonymisation_rules.length})`, icon: <Shield size={14} /> },
            { id: "activity", label: `Activity Trail (${auditLogs.length})`, icon: <ScrollText size={14} /> },
            { id: "playground", label: "Test Console", icon: <Terminal size={14} /> },
            { id: "settings", label: "Settings", icon: <Settings size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pill-tab ${activeTab === tab.id ? "active" : ""}`}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DOCUMENTS (NO VIEW CONTENT FOR PDF DOCUMENTS AS REQUESTED)        */}
      {/* ========================================================================= */}
      {activeTab === "documents" && (
        <div>
          {files.length === 0 ? (
            <div className="frosted-panel" style={{ textAlign: "center", padding: "clamp(3rem, 6vw, 5rem) 1.5rem" }}>
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: "var(--accent-lime-bg)",
                border: "1px solid var(--accent-lime-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.25rem auto",
                color: "var(--accent-lime)",
              }}>
                <FileText size={26} />
              </div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 600, marginBottom: "0.4rem", color: "var(--color-obsidian)" }}>
                No documents uploaded yet
              </h3>
              <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", maxWidth: "440px", margin: "0 auto 1.75rem auto", lineHeight: 1.6 }}>
                Upload PDF reports, CSV data tables, or text files. AI models can safely query them under policy control.
              </p>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="pill-btn pill-btn-solid"
              >
                <Upload size={15} />
                Upload Your First Document
              </button>
            </div>
          ) : (
            <div className="frosted-panel" style={{ overflowX: "auto" }}>
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
                      <td style={{ fontWeight: 500, color: "var(--color-obsidian)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <FileText size={16} color={isDataFile(file) ? "var(--accent-lime)" : "#64748b"} />
                          <span>{file.original_filename}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge-status" style={{ background: "rgba(0,0,0,0.04)", color: "var(--text-secondary)" }}>
                          {file.file_type}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem" }}>
                        {(file.file_size / 1024).toFixed(1)} KB
                      </td>
                      <td>
                        <span className={`badge-status ${file.status === "READY" ? "badge-status-allow" : file.status === "FAILED" ? "badge-status-deny" : "badge-status-transform"}`}>
                          {file.status === "READY" ? "Ready for AI" : file.status}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-dim)", fontSize: "0.82rem" }}>
                        {new Date(file.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                          {/* ONLY CSV / JSON show View Content; NO view content for PDF documents */}
                          {file.file_type !== "PDF" && (
                            <button
                              onClick={() => handleViewContent(file)}
                              className="pill-btn pill-btn-glass"
                              style={{ padding: "0.3rem 0.8rem", fontSize: "0.78rem" }}
                            >
                              View Content
                            </button>
                          )}
                          {workspace.role === "OWNER" && (
                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              className="pill-btn pill-btn-glass"
                              style={{ padding: "0.3rem 0.6rem", color: "var(--status-deny)" }}
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
      {/* TAB 2: AI LINKS */}
      {/* ========================================================================= */}
      {activeTab === "links" && (
        <div>
          <div className="frosted-panel" style={{ padding: "clamp(1.25rem, 3vw, 2rem)", marginBottom: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <div className="slash-tag">AI CONNECTIONS</div>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 600, marginBottom: "0.3rem", color: "var(--color-obsidian)" }}>
                  Active MCP Sharing Links
                </h3>
                <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", maxWidth: "600px", lineHeight: 1.5 }}>
                  Create as many distinct MCP links as you need. Each link has dedicated document permissions and custom data masking policies.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedFileIds(files.map((f) => f.id));
                  setShareStep(1);
                  const firstDataFile = files.find(isDataFile);
                  if (firstDataFile) {
                    setActiveTransformFileId(firstDataFile.id);
                  }
                  setShareWizardOpen(true);
                }}
                className="pill-btn pill-btn-solid"
              >
                <Plus size={15} />
                Create New MCP Link
              </button>
            </div>
          </div>

          <div className="frosted-panel" style={{ overflowX: "auto" }}>
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
                    <td colSpan={5} style={{ textAlign: "center", padding: "4rem", color: "var(--text-dim)" }}>
                      No links created yet. Click &quot;Create New MCP Link&quot; above to connect Claude Desktop or an AI agent.
                    </td>
                  </tr>
                ) : (
                  mcpCredentials.map((cred) => (
                    <tr key={cred.id}>
                      <td style={{ fontWeight: 500, color: "var(--color-obsidian)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <Key size={15} color="var(--accent-lime)" />
                          <span>{cred.name}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem", color: "var(--accent-lime)" }}>
                        {cred.credential_prefix}...
                      </td>
                      <td style={{ color: "var(--text-dim)", fontSize: "0.82rem" }}>
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
                              className="pill-btn pill-btn-glass"
                              style={{ padding: "0.25rem 0.7rem", fontSize: "0.75rem" }}
                            >
                              Rotate Key
                            </button>
                            <button
                              onClick={() => handleRevokeMCP(cred.id)}
                              className="pill-btn pill-btn-glass"
                              style={{ padding: "0.25rem 0.7rem", fontSize: "0.75rem", color: "var(--status-deny)" }}
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", gap: "1.75rem" }}>
          {/* Anonymisation Rules */}
          <div className="frosted-panel" style={{ padding: "clamp(1.25rem, 3vw, 2rem)" }}>
            <div className="slash-tag">DATA MASKING</div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.3rem", color: "var(--color-obsidian)" }}>
              Active Anonymisation Rules
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              These rules mask sensitive PII before AI models receive query results.
            </p>

            <div>
              {policies.anonymisation_rules.length === 0 ? (
                <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", fontStyle: "italic", padding: "1rem 0" }}>
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
                      padding: "0.85rem 0",
                      borderBottom: "1px solid var(--glass-border-subtle)",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, fontSize: "0.9rem", color: "var(--color-obsidian)" }}>{rule.entity_type}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
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
          <div className="frosted-panel" style={{ padding: "clamp(1.25rem, 3vw, 2rem)" }}>
            <div className="slash-tag">DOCUMENT ACCESS</div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.3rem", color: "var(--color-obsidian)" }}>
              File Permissions
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              Restrictions placed on individual files or workspace resources.
            </p>

            <div>
              {policies.resource_policies.length === 0 ? (
                <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", fontStyle: "italic", padding: "1rem 0" }}>
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
                        padding: "0.85rem 0",
                        borderBottom: "1px solid var(--glass-border-subtle)",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                      }}
                    >
                      <div style={{ fontWeight: 500, fontSize: "0.9rem", color: "var(--color-obsidian)" }}>
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
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--glass-border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}>
            <div>
              <div className="slash-tag">AUDIT TRAIL</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--color-obsidian)" }}>Activity &amp; Query Log</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                Every tool call and data request is logged securely without exposing private secrets.
              </p>
            </div>
            <button onClick={loadWorkspaceData} className="pill-btn pill-btn-glass" style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}>
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
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
                    <td colSpan={5} style={{ textAlign: "center", padding: "4rem", color: "var(--text-dim)" }}>
                      No activity recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ color: "var(--text-dim)", whiteSpace: "nowrap", fontFamily: "JetBrains Mono, monospace", fontSize: "0.78rem" }}>
                        {new Date(log.timestamp).toLocaleTimeString()} · {new Date(log.timestamp).toLocaleDateString()}
                      </td>
                      <td style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 500, fontSize: "0.85rem", color: "var(--accent-lime)" }}>
                        {log.operation}
                      </td>
                      <td>
                        <span className="badge-status" style={{ background: "rgba(0,0,0,0.04)", color: "var(--text-secondary)" }}>
                          {log.actor_type}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-status ${log.decision === "ALLOW" ? "badge-status-allow" : "badge-status-deny"}`}>
                          {log.decision}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", maxWidth: "320px", fontSize: "0.82rem" }}>
                        {log.reason || "—"}
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
      {/* TAB 5: TEST CONSOLE (PLAYGROUND) */}
      {/* ========================================================================= */}
      {activeTab === "playground" && (
        <div className="frosted-panel" style={{ padding: "clamp(1.25rem, 3vw, 2rem)" }}>
          <div className="slash-tag">DEVELOPER CONSOLE</div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: 600, marginBottom: "0.3rem", color: "var(--color-obsidian)" }}>
            MCP Tool Test Console
          </h3>
          <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginBottom: "1.75rem" }}>
            Test live JSON-RPC requests directly against your MCP gateway.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "1.75rem" }}>
            <div>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
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

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
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
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
                  Arguments (JSON)
                </label>
                <textarea
                  className="modern-input"
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem", height: "120px", resize: "vertical" }}
                  value={playgroundArgs}
                  onChange={(e) => setPlaygroundArgs(e.target.value)}
                />
              </div>

              <button
                onClick={handleExecutePlayground}
                disabled={playgroundLoading}
                className="pill-btn pill-btn-solid"
                style={{ width: "100%", padding: "0.75rem" }}
              >
                <Terminal size={15} />
                {playgroundLoading ? "Running..." : "Run MCP Request"}
              </button>
            </div>

            <div style={{
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--glass-border-subtle)",
              background: "var(--color-obsidian)",
              color: "#ffffff",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}>
              <div style={{
                padding: "0.75rem 1.25rem",
                background: "rgba(255, 255, 255, 0.05)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                fontSize: "0.75rem",
                fontFamily: "JetBrains Mono, monospace",
                color: "var(--text-muted)",
              }}>
                response.json
              </div>

              <div style={{
                flex: 1,
                padding: "1.25rem",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "0.82rem",
                overflowY: "auto",
                maxHeight: "340px",
              }}>
                {playgroundResult ? (
                  <pre style={{ color: "#84cc16" }}>{JSON.stringify(playgroundResult, null, 2)}</pre>
                ) : (
                  <div style={{ color: "var(--text-dim)", fontStyle: "italic", paddingTop: "2rem", textAlign: "center" }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: "1.75rem" }}>
          {/* Members */}
          <div className="frosted-panel" style={{ padding: "clamp(1.25rem, 3vw, 2rem)" }}>
            <div className="slash-tag">TEAM ACCESS</div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.3rem", color: "var(--color-obsidian)" }}>
              Workspace Access
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              Share this workspace with colleagues by username.
            </p>

            {workspace.role === "OWNER" && (
              <form onSubmit={handleAddMember} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.75rem", flexWrap: "wrap" }}>
                <input
                  type="text"
                  required
                  className="modern-input"
                  placeholder="Username"
                  value={newMemberUsername}
                  onChange={(e) => setNewMemberUsername(e.target.value)}
                  style={{ flex: "1 1 140px" }}
                />
                <select
                  className="modern-input"
                  style={{ width: "110px" }}
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="OWNER">OWNER</option>
                </select>
                <button type="submit" className="pill-btn pill-btn-solid" style={{ padding: "0.5rem 1.1rem" }}>
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
                    padding: "0.85rem 0",
                    borderBottom: "1px solid var(--glass-border-subtle)",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: "0.9rem", color: "var(--color-obsidian)" }}>{m.username || m.user_id}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>Joined {new Date(m.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span className="badge-status" style={{ background: "rgba(0,0,0,0.04)", color: "var(--text-secondary)" }}>{m.role}</span>
                    {workspace.role === "OWNER" && m.user_id !== workspace.owner_id && (
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        style={{ color: "var(--text-dim)", background: "transparent", border: "none", cursor: "pointer" }}
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
          <div className="frosted-panel" style={{ padding: "clamp(1.25rem, 3vw, 2rem)", border: "1px solid rgba(220, 38, 38, 0.25)", background: "var(--status-deny-bg)" }}>
            <div className="slash-tag" style={{ color: "var(--status-deny)" }}>DANGER ZONE</div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--status-deny)", marginBottom: "0.3rem" }}>
              Delete Workspace
            </h3>
            <p style={{ fontSize: "0.88rem", color: "#991b1b", marginBottom: "1.5rem" }}>
              Permanently delete this workspace and all associated files.
            </p>

            {workspace.role === "OWNER" && (
              <button
                onClick={handleDeleteWorkspace}
                className="pill-btn pill-btn-glass"
                style={{ color: "var(--status-deny)", borderColor: "rgba(220, 38, 38, 0.3)" }}
              >
                <Trash2 size={14} />
                Delete Workspace Permanently
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3-STEP UPLOAD MODAL */}
      {/* ========================================================================= */}
      {uploadModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.35)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 150,
          padding: "1rem",
        }}>
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: "520px",
            padding: "clamp(1.75rem, 4vw, 2.5rem) clamp(1.25rem, 3vw, 2.25rem)",
            position: "relative",
            background: "#ffffff",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius-xl)",
            maxHeight: "92vh",
            overflowY: "auto",
          }}>
            <button
              onClick={() => setUploadModalOpen(false)}
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background: "var(--canvas-bg)",
                border: "1px solid var(--glass-border-subtle)",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={14} />
            </button>

            <div className="slash-tag">EASY UPLOAD</div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "0.3rem", color: "var(--color-obsidian)" }}>
              Upload Document to Workspace
            </h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginBottom: "1.75rem", lineHeight: 1.5 }}>
              Follow 3 simple steps to add files for your AI agents to query.
            </p>

            {/* Step 1: File selection */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "var(--color-obsidian)", color: "#fff", fontSize: "0.75rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  1
                </span>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", color: "var(--color-obsidian)" }}>
                  Choose Your File
                </span>
              </div>

              {!uploadFile ? (
                <label style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "1.75rem 1rem",
                  border: "2px dashed var(--glass-border-subtle)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--canvas-bg)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  textAlign: "center",
                }}>
                  <Upload size={24} color="var(--accent-lime)" style={{ marginBottom: "0.5rem" }} />
                  <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-obsidian)" }}>
                    Click to browse or drag file here
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>
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
                  padding: "0.85rem 1.1rem",
                  background: "var(--canvas-bg)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--glass-border-subtle)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                    <FileText size={18} color="var(--accent-lime)" />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: "0.88rem", color: "var(--color-obsidian)" }}>{uploadFile.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{(uploadFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setUploadFile(null)}
                    style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer" }}
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Description for AI */}
            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "var(--color-obsidian)", color: "#fff", fontSize: "0.75rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  2
                </span>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", color: "var(--color-obsidian)" }}>
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

            {/* Step 3: Action */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="pill-btn pill-btn-glass"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!uploadFile || uploading}
                onClick={handleExecuteUpload}
                className="pill-btn pill-btn-solid"
              >
                {uploading ? "Processing Document..." : "Upload & Save"}
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 ABOX SHARE MCP LINK WIZARD (TRANSFORMATION ONLY FOR TABULAR DATA)       */}
      {/* ========================================================================= */}
      {shareWizardOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(14px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 160,
          padding: "clamp(0.5rem, 2vw, 1.5rem)",
        }}>
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: shareStep === 2 && hasDataFilesSelected ? "1080px" : "560px",
            maxHeight: "94vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "#ffffff",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius-xl)",
            transition: "max-width 0.25s ease",
          }}>
            {/* Header with Step Tracker */}
            <div style={{
              padding: "1.25rem clamp(1rem, 3vw, 2rem) 1rem clamp(1rem, 3vw, 2rem)",
              borderBottom: "1px solid var(--glass-border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}>
              <div>
                <div className="slash-tag" style={{ margin: 0, marginBottom: "0.2rem" }}>
                  {hasDataFilesSelected
                    ? `STEP ${shareStep} OF 2: ${shareStep === 1 ? "SELECT FILES" : "POWER QUERY DATA TRANSFORMATION"}`
                    : "ABOX LINK CONFIGURATION"}
                </div>
                <h2 style={{ fontSize: "clamp(1.15rem, 2.5vw, 1.35rem)", fontWeight: 600, color: "var(--color-obsidian)" }}>
                  {shareStep === 1
                    ? "Configure AI Link & File Scope"
                    : "Data & Column Transformation Studio"}
                </h2>
              </div>

              <button
                onClick={() => setShareWizardOpen(false)}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "var(--canvas-bg)",
                  border: "1px solid var(--glass-border-subtle)",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem clamp(1rem, 3vw, 2rem)" }}>
              {/* ========================================================================= */}
              {/* STEP 1: LINK IDENTITY & FILE SELECTION */}
              {/* ========================================================================= */}
              {shareStep === 1 && (
                <div>
                  <div style={{ marginBottom: "1.75rem" }}>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", marginBottom: "0.45rem", color: "var(--color-obsidian)" }}>
                      1. Link Label / Purpose
                    </label>
                    <input
                      type="text"
                      className="modern-input"
                      placeholder="e.g. Claude Support Bot or Financial Analyst"
                      value={shareName}
                      onChange={(e) => setShareName(e.target.value)}
                    />
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                      Give this link a clear name so you can track its activity in the audit trail.
                    </div>
                  </div>

                  <div style={{ marginBottom: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                      <label style={{ fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", color: "var(--color-obsidian)" }}>
                        2. Select Files to Include for this Link ({selectedFileIds.length}/{files.length})
                      </label>

                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedFileIds(files.map((f) => f.id))}
                          style={{ fontSize: "0.75rem", background: "none", border: "none", color: "var(--accent-lime)", cursor: "pointer", fontWeight: 600 }}
                        >
                          Select All
                        </button>
                        <span style={{ color: "var(--text-dim)" }}>·</span>
                        <button
                          type="button"
                          onClick={() => setSelectedFileIds([])}
                          style={{ fontSize: "0.75rem", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    <div style={{
                      maxHeight: "220px",
                      overflowY: "auto",
                      background: "var(--canvas-bg)",
                      padding: "0.85rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--glass-border-subtle)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.4rem",
                    }}>
                      {files.length === 0 ? (
                        <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", textAlign: "center", padding: "1.5rem" }}>
                          No documents uploaded yet. Upload a file first.
                        </div>
                      ) : (
                        files.map((f) => {
                          const isChecked = selectedFileIds.includes(f.id);
                          const isData = isDataFile(f);
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
                                justifyContent: "space-between",
                                padding: "0.6rem 0.85rem",
                                borderRadius: "var(--radius-sm)",
                                background: isChecked ? "#ffffff" : "transparent",
                                border: isChecked ? "1px solid var(--glass-border-subtle)" : "1px solid transparent",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                                {isChecked ? <CheckSquare size={16} color="var(--accent-lime)" /> : <Square size={16} color="var(--text-dim)" />}
                                <FileText size={15} color={isData ? "var(--accent-lime)" : "#64748b"} />
                                <span style={{ fontSize: "0.88rem", fontWeight: isChecked ? 600 : 400, color: "var(--color-obsidian)" }}>
                                  {f.original_filename}
                                </span>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <span style={{
                                  fontSize: "0.68rem",
                                  fontWeight: 600,
                                  padding: "0.1rem 0.4rem",
                                  borderRadius: "var(--radius-pill)",
                                  background: isData ? "var(--accent-lime-bg)" : "rgba(0,0,0,0.04)",
                                  color: isData ? "var(--accent-lime)" : "var(--text-muted)",
                                }}>
                                  {isData ? "DATA" : "DOC"}
                                </span>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
                                  {(f.file_size / 1024).toFixed(0)} KB
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {!hasDataFilesSelected && selectedFiles.length > 0 && (
                      <div style={{
                        marginTop: "1rem",
                        padding: "0.75rem 1rem",
                        background: "rgba(0,0,0,0.03)",
                        borderRadius: "var(--radius-md)",
                        fontSize: "0.82rem",
                        color: "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}>
                        <ShieldCheck size={16} color="var(--accent-lime)" />
                        <span>Selected files are documents (PDF/Word/Text). They will be served safely via standard MCP resources with no column transformation needed.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* STEP 2: POWER QUERY TRANSFORMATION STUDIO (ONLY FOR DATA FILES)           */}
              {/* ========================================================================= */}
              {shareStep === 2 && hasDataFilesSelected && (
                <div>
                  {/* File Selector Tabs for tabular data files only */}
                  <div style={{ marginBottom: "1.25rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginRight: "0.4rem" }}>
                        Active Data File:
                      </span>
                      {selectedDataFiles.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setActiveTransformFileId(f.id)}
                          className={`pill-tab ${activeTransformFile?.id === f.id ? "active" : ""}`}
                          style={{ fontSize: "0.8rem", padding: "0.35rem 0.85rem", gap: "0.4rem", display: "flex", alignItems: "center" }}
                        >
                          <Table size={13} color="var(--accent-lime)" />
                          <span>{f.original_filename}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeTransformFile && (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
                      gap: "1.5rem",
                      alignItems: "start",
                    }}>
                      {/* Left: Power Query Column List */}
                      <div>
                        <div style={{
                          background: "var(--canvas-bg)",
                          padding: "clamp(1rem, 2.5vw, 1.25rem)",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--glass-border-subtle)",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                            <div style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", color: "var(--color-obsidian)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <Columns size={14} color="var(--accent-lime)" />
                              <span>Columns ({availableColumns.length})</span>
                            </div>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Click to Inspect</span>
                          </div>

                          {/* Column Selection List */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
                            {availableColumns.map((col) => {
                              const action = columnActions[col.name] || "KEEP";
                              const isSelected = selectedColumnName === col.name;
                              return (
                                <div
                                  key={col.name}
                                  onClick={() => setSelectedColumnName(col.name)}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "0.6rem 0.75rem",
                                    background: isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
                                    borderRadius: "var(--radius-sm)",
                                    border: isSelected ? "1.5px solid var(--accent-lime)" : "1px solid var(--glass-border-subtle)",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                    boxShadow: isSelected ? "0 2px 8px rgba(132, 204, 22, 0.12)" : "none",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span style={{
                                      width: "20px",
                                      height: "20px",
                                      borderRadius: "4px",
                                      background: isSelected ? "var(--accent-lime-bg)" : "rgba(0,0,0,0.04)",
                                      color: isSelected ? "var(--accent-lime)" : "var(--text-dim)",
                                      fontFamily: "JetBrains Mono, monospace",
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}>
                                      {col.letter}
                                    </span>
                                    <div>
                                      <div style={{ fontSize: "0.84rem", fontWeight: isSelected ? 700 : 500, color: "var(--color-obsidian)", fontFamily: "JetBrains Mono, monospace" }}>
                                        {col.name}
                                      </div>
                                      <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                                        {col.type}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Action Status Badge */}
                                  <span style={{
                                    fontSize: "0.7rem",
                                    fontWeight: 600,
                                    padding: "0.15rem 0.5rem",
                                    borderRadius: "var(--radius-pill)",
                                    background: action === "REMOVE" ? "var(--status-deny-bg)" : action === "MASK" ? "var(--accent-lime-bg)" : "rgba(0,0,0,0.04)",
                                    color: action === "REMOVE" ? "var(--status-deny)" : action === "MASK" ? "var(--accent-lime)" : "var(--text-secondary)",
                                  }}>
                                    {action === "REMOVE" ? "Dropped" : action === "MASK" ? "Masked" : "Passed"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Additional Redaction Input */}
                          <div>
                            <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.3rem", fontWeight: 500 }}>
                              Custom columns to drop (comma-separated):
                            </label>
                            <input
                              type="text"
                              className="modern-input"
                              placeholder="e.g. credit_card, zip_code"
                              value={customColumnsToHide}
                              onChange={(e) => setCustomColumnsToHide(e.target.value)}
                              style={{ fontSize: "0.8rem", padding: "0.45rem 0.7rem" }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: Interactive Excel Spreadsheet & Live Transform Preview */}
                      <div>
                        <div style={{
                          background: "var(--canvas-bg)",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--glass-border-subtle)",
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column",
                        }}>
                          {/* Active Column Transformation Toolbar */}
                          <div style={{
                            padding: "0.85rem 1.15rem",
                            background: "#ffffff",
                            borderBottom: "1px solid var(--glass-border-subtle)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "0.75rem",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                                Selected:
                              </span>
                              <span style={{
                                fontFamily: "JetBrains Mono, monospace",
                                fontWeight: 700,
                                fontSize: "0.88rem",
                                color: "var(--color-obsidian)",
                                background: "var(--accent-lime-bg)",
                                padding: "0.15rem 0.5rem",
                                borderRadius: "4px",
                                border: "1px solid var(--accent-lime-border)",
                              }}>
                                {selectedColumnName}
                              </span>
                            </div>

                            {/* Transformation Action Buttons for Selected Column */}
                            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginRight: "0.2rem" }}>Action:</span>
                              <button
                                type="button"
                                onClick={() => setColumnActions({ ...columnActions, [selectedColumnName]: "KEEP" })}
                                style={{
                                  fontSize: "0.75rem",
                                  padding: "0.3rem 0.7rem",
                                  borderRadius: "var(--radius-pill)",
                                  border: "1px solid",
                                  borderColor: (columnActions[selectedColumnName] || "KEEP") === "KEEP" ? "var(--color-obsidian)" : "var(--glass-border-subtle)",
                                  background: (columnActions[selectedColumnName] || "KEEP") === "KEEP" ? "var(--color-obsidian)" : "#ffffff",
                                  color: (columnActions[selectedColumnName] || "KEEP") === "KEEP" ? "#ffffff" : "var(--text-secondary)",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                Keep Original
                              </button>

                              <button
                                type="button"
                                onClick={() => setColumnActions({ ...columnActions, [selectedColumnName]: "MASK" })}
                                style={{
                                  fontSize: "0.75rem",
                                  padding: "0.3rem 0.7rem",
                                  borderRadius: "var(--radius-pill)",
                                  border: "1px solid",
                                  borderColor: columnActions[selectedColumnName] === "MASK" ? "var(--accent-lime)" : "var(--glass-border-subtle)",
                                  background: columnActions[selectedColumnName] === "MASK" ? "var(--accent-lime-bg)" : "#ffffff",
                                  color: columnActions[selectedColumnName] === "MASK" ? "var(--accent-lime)" : "var(--text-secondary)",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                ✦ Mask / Anonymize
                              </button>

                              <button
                                type="button"
                                onClick={() => setColumnActions({ ...columnActions, [selectedColumnName]: "REMOVE" })}
                                style={{
                                  fontSize: "0.75rem",
                                  padding: "0.3rem 0.7rem",
                                  borderRadius: "var(--radius-pill)",
                                  border: "1px solid",
                                  borderColor: columnActions[selectedColumnName] === "REMOVE" ? "var(--status-deny)" : "var(--glass-border-subtle)",
                                  background: columnActions[selectedColumnName] === "REMOVE" ? "var(--status-deny-bg)" : "#ffffff",
                                  color: columnActions[selectedColumnName] === "REMOVE" ? "var(--status-deny)" : "var(--text-secondary)",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                Drop Column
                              </button>
                            </div>
                          </div>

                          {/* Excel / Spreadsheet Grid Canvas */}
                          <div style={{ overflowX: "auto", maxHeight: "320px" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", fontFamily: "JetBrains Mono, monospace" }}>
                              <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                  <th style={{ width: "35px", padding: "0.4rem", color: "var(--text-dim)", textAlign: "center", borderRight: "1px solid #e2e8f0", fontSize: "0.72rem" }}>
                                    #
                                  </th>
                                  {availableColumns.map((col) => {
                                    const action = columnActions[col.name] || "KEEP";
                                    const isSelected = selectedColumnName === col.name;
                                    return (
                                      <th
                                        key={col.name}
                                        onClick={() => setSelectedColumnName(col.name)}
                                        style={{
                                          padding: "0.55rem 0.75rem",
                                          textAlign: "left",
                                          borderRight: "1px solid #e2e8f0",
                                          background: isSelected ? "rgba(132, 204, 22, 0.08)" : action === "REMOVE" ? "rgba(220, 38, 38, 0.05)" : "inherit",
                                          cursor: "pointer",
                                          userSelect: "none",
                                        }}
                                      >
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem" }}>
                                          <div>
                                            <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginRight: "0.3rem" }}>{col.letter}</span>
                                            <span style={{
                                              fontWeight: 600,
                                              color: action === "REMOVE" ? "var(--status-deny)" : "var(--color-obsidian)",
                                              textDecoration: action === "REMOVE" ? "line-through" : "none",
                                            }}>
                                              {col.name}
                                            </span>
                                          </div>
                                          <span style={{
                                            fontSize: "0.65rem",
                                            fontWeight: 700,
                                            padding: "0.1rem 0.35rem",
                                            borderRadius: "3px",
                                            background: action === "REMOVE" ? "var(--status-deny)" : action === "MASK" ? "var(--accent-lime)" : "#94a3b8",
                                            color: "#ffffff",
                                          }}>
                                            {action === "REMOVE" ? "DROP" : action === "MASK" ? "MASK" : "KEEP"}
                                          </span>
                                        </div>
                                      </th>
                                    );
                                  })}
                                </tr>
                              </thead>

                              <tbody>
                                {[0, 1, 2, 3].map((rowIdx) => (
                                  <tr key={rowIdx} style={{ borderBottom: "1px solid #f1f5f9", background: rowIdx % 2 === 0 ? "#ffffff" : "#fafafa" }}>
                                    <td style={{
                                      padding: "0.45rem",
                                      textAlign: "center",
                                      color: "var(--text-dim)",
                                      borderRight: "1px solid #e2e8f0",
                                      fontSize: "0.72rem",
                                      background: "#f8fafc",
                                      fontWeight: 600,
                                    }}>
                                      {rowIdx + 1}
                                    </td>

                                    {availableColumns.map((col) => {
                                      const action = columnActions[col.name] || "KEEP";
                                      const isSelected = selectedColumnName === col.name;
                                      const rawVal = col.sample[rowIdx];

                                      let displayVal = rawVal;
                                      if (action === "REMOVE") {
                                        displayVal = "[DROPPED BY POLICY]";
                                      } else if (action === "MASK") {
                                        if (col.type === "email") displayVal = rawVal.replace(/(^.).*(@.*)/, "$1***$2");
                                        else if (col.type === "tax_id") displayVal = "XXX-XX-" + rawVal.slice(-4);
                                        else displayVal = `***${rawVal.slice(-3)}`;
                                      }

                                      return (
                                        <td
                                          key={col.name}
                                          onClick={() => setSelectedColumnName(col.name)}
                                          style={{
                                            padding: "0.45rem 0.75rem",
                                            borderRight: "1px solid #e2e8f0",
                                            background: isSelected ? "rgba(132, 204, 22, 0.05)" : action === "REMOVE" ? "rgba(220, 38, 38, 0.03)" : "inherit",
                                            color: action === "REMOVE" ? "#94a3b8" : action === "MASK" ? "var(--accent-lime)" : "var(--color-obsidian)",
                                            fontStyle: action === "REMOVE" ? "italic" : "normal",
                                            fontWeight: action === "MASK" ? 600 : 400,
                                            cursor: "pointer",
                                          }}
                                        >
                                          {displayVal}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div style={{
                            padding: "0.6rem 1.15rem",
                            background: "#f8fafc",
                            borderTop: "1px solid #e2e8f0",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            flexWrap: "wrap",
                            gap: "0.3rem",
                          }}>
                            <span>Live Power Query Output Preview for AI Agents</span>
                            <span style={{ color: "var(--accent-lime)", fontWeight: 600 }}>
                              ✓ Changes Applied Dynamically
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div style={{
              padding: "1rem clamp(1rem, 3vw, 2rem)",
              borderTop: "1px solid var(--glass-border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--canvas-bg)",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}>
              {shareStep === 2 ? (
                <button
                  type="button"
                  onClick={() => setShareStep(1)}
                  className="pill-btn pill-btn-glass"
                  style={{ gap: "0.4rem" }}
                >
                  <ArrowLeft size={14} />
                  <span>Back to File Selection</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShareWizardOpen(false)}
                  className="pill-btn pill-btn-glass"
                >
                  Cancel
                </button>
              )}

              {shareStep === 1 && hasDataFilesSelected ? (
                <button
                  type="button"
                  disabled={selectedFileIds.length === 0 || !shareName.trim()}
                  onClick={() => setShareStep(2)}
                  className="pill-btn pill-btn-solid"
                >
                  <span>Next: Power Query Data Transformation</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={generatingLink || selectedFileIds.length === 0 || !shareName.trim()}
                  onClick={handleGenerateShareLink}
                  className="pill-btn pill-btn-solid"
                >
                  <Key size={14} />
                  <span>{generatingLink ? "Generating Link..." : "Generate ABOX MCP Link"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW EXTRACTED CONTENT (ONLY NON-PDF ASSETS)                      */}
      {/* ========================================================================= */}
      {selectedFileContent && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.35)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 150,
          padding: "1rem",
        }}>
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: "800px",
            maxHeight: "88vh",
            display: "flex",
            flexDirection: "column",
            padding: "clamp(1.5rem, 3vw, 2.25rem)",
            position: "relative",
            background: "#ffffff",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius-xl)",
          }}>
            <button
              onClick={() => setSelectedFileContent(null)}
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background: "var(--canvas-bg)",
                border: "1px solid var(--glass-border-subtle)",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={14} />
            </button>

            <div className="slash-tag">PARSED CONTENT</div>
            <h3 style={{ fontSize: "1.35rem", fontWeight: 600, marginBottom: "0.3rem", color: "var(--color-obsidian)" }}>
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
              padding: "1.1rem",
              background: "var(--canvas-bg)",
              border: "1px solid var(--glass-border-subtle)",
              borderRadius: "var(--radius-md)",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "0.82rem",
              lineHeight: 1.65,
              color: "var(--color-obsidian)",
              whiteSpace: "pre-wrap",
              marginBottom: "1rem",
            }}>
              {selectedFileContent.plain_text}
            </div>

            {selectedFileContent.detected_entities && selectedFileContent.detected_entities.length > 0 && (
              <div style={{
                maxHeight: "100px",
                overflowY: "auto",
                background: "var(--canvas-bg)",
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--glass-border-subtle)",
              }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
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
          background: "rgba(15, 23, 42, 0.35)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 200,
          padding: "1rem",
        }}>
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: "620px",
            padding: "clamp(1.75rem, 4vw, 2.5rem) clamp(1.25rem, 3vw, 2.25rem)",
            background: "#ffffff",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius-xl)",
            maxHeight: "92vh",
            overflowY: "auto",
          }}>
            <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
              <div className="slash-tag" style={{ justifyContent: "center" }}>ABOX MCP LINK READY</div>
              <h3 style={{ fontSize: "1.45rem", fontWeight: 600, marginBottom: "0.3rem", color: "var(--color-obsidian)" }}>
                Your Shareable MCP Token
              </h3>
              <p style={{
                fontSize: "0.82rem",
                color: "var(--status-deny)",
                background: "var(--status-deny-bg)",
                padding: "0.4rem 0.9rem",
                borderRadius: "var(--radius-pill)",
                display: "inline-block",
                border: "1px solid rgba(220, 38, 38, 0.2)",
              }}>
                Copy this token now. It cannot be recovered after closing this window.
              </p>
            </div>

            {/* Claude.ai Web Remote Connector URL */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", color: "var(--color-obsidian)", marginBottom: "0.35rem" }}>
                1. Claude.ai Web Remote Connector URL
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <input
                  type="text"
                  readOnly
                  value={`${process.env.NEXT_PUBLIC_API_URL || "https://dbmcp.onrender.com"}/mcp?token=${createdCredential.raw_token}`}
                  className="modern-input"
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem", background: "var(--canvas-bg)", flex: "1 1 200px" }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_API_URL || "https://dbmcp.onrender.com"}/mcp?token=${createdCredential.raw_token}`);
                    notify("success", "Claude.ai Connector URL copied!");
                  }}
                  className="pill-btn pill-btn-solid"
                  style={{ padding: "0 1.15rem" }}
                >
                  <Copy size={14} />
                  <span>Copy URL</span>
                </button>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                Paste this into Claude.ai with <strong>Authentication: None</strong> to connect directly and securely.
              </div>
            </div>

            {/* Copyable Bearer Token */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                2. Bearer Authentication Token
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <input
                  type="text"
                  readOnly
                  value={createdCredential.raw_token}
                  className="modern-input"
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem", flex: "1 1 200px" }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdCredential.raw_token);
                    setCopiedToken(true);
                    notify("success", "Token copied to clipboard.");
                    setTimeout(() => setCopiedToken(false), 2000);
                  }}
                  className="pill-btn pill-btn-glass"
                  style={{ padding: "0 1.15rem" }}
                >
                  {copiedToken ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedToken ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Claude Desktop Config Snippet */}
            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                3. Claude Desktop / Cursor JSON Config
              </div>
              <div style={{
                padding: "0.85rem 1.1rem",
                background: "var(--color-obsidian)",
                borderRadius: "var(--radius-md)",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "0.78rem",
                overflowX: "auto",
                color: "#84cc16",
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
              className="pill-btn pill-btn-solid"
              style={{ width: "100%", padding: "0.75rem" }}
            >
              Done, I Have Saved This Token
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
