"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getApiBase } from "@/lib/api";
import {
  AccountMCPActivity,
  AccountMCPCredential,
  AccountMCPCredentialCreated,
  AccountMCPPermissions,
  User,
} from "@/lib/types";
import {
  User as UserIcon,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  LogOut,
  X,
  Lock,
  Bot,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Plus,
  Terminal,
  ExternalLink,
  Globe,
  Database,
  FileText,
  UploadCloud,
  RotateCw,
  Activity,
  Layers,
  Sliders,
  Search,
  Key,
  Download,
} from "lucide-react";

const POAIS_ACCOUNT_AI_SKILLS_MARKDOWN = `# POAIS: Policy-Oriented AI Space
## Account Master AI Agent Skills, Autonomous Workflows & Operational Protocol

You are connected to POAIS as an **Autonomous Account Master AI Operator** via the Model Context Protocol (MCP).
Use these instructions to manage workspaces, ingest data, execute analytics, and operate autonomously while upholding strict privacy, security, and verification guarantees.

---

## 🛠️ Complete Account Master MCP Tool Suite

1. \`account_info()\`
   - Retrieve authenticated user ID, username, and workspace summary statistics.

2. \`list_workspaces()\`
   - Discover all accessible workspaces across the account with member roles and file counts.

3. \`create_workspace(name, description)\`
   - Autonomously provision new isolated workspaces for projects, teams, or datasets.

4. \`get_workspace(workspace_id)\`
   - Inspect workspace details, permissions, and active privacy policies.

5. \`list_files(workspace_id)\`
   - List all indexed documents (PDF, DOCX, TXT, JSON, Images) and structured tables (CSV, Excel .xlsx).

6. \`import_cloud_link(url, workspace_id, custom_filename, description)\`
   - **Autonomous Link Ingestion Engine**: Ingest and index shared Google Drive, Dropbox, or public document/data links directly into a workspace.

7. \`upload_file(workspace_id, filename, content, description)\`
   - Ingest raw text, markdown, CSV, or JSON directly into a target workspace.

8. \`read_file_content(resource_id)\`
   - Read extracted document text or JSON with real-time PII anonymisation and column masking applied.

9. \`query_dataset(resource_id, columns, filters, limit, aggregation)\`
   - Execute exact-match filtering, custom column projections, and aggregations over tabular datasets.

10. \`edit_dataset(resource_id, action, filters, updates, new_row)\`
    - Safely modify dataset records: \`update\`, \`insert\`, or \`delete\`.

11. \`delete_file(resource_id)\`
    - Remove a document or dataset file from a workspace.

12. \`list_workspace_mcp_links(workspace_id)\`
    - Inspect active delegated MCP credentials for a specific workspace.

13. \`generate_workspace_mcp_link(workspace_id, name, permissions, expires_in_days)\`
    - Delegate scoped, revocable MCP tokens for specialized AI tasks or subagents.

14. \`revoke_workspace_mcp_link(credential_id)\`
    - Revoke a delegated workspace MCP credential.

---

## ⚡ AUTONOMOUS WORKFLOWS & OPERATIONAL DIRECTIVES

### 1. AUTONOMOUS EXTERNAL LINK INGESTION & DEEP ANALYSIS (CRITICAL)
- When a user shares a Google Drive, Dropbox, or external web link and asks you to:
  - *"Analyze this link"*, *"Understand this document"*, *"Extract insights from this sheet"*, or *"Inspect this dataset"*:
- **MANDATORY 4-STEP AUTONOMOUS WORKFLOW**:
  1. **Identify or Create Target Workspace**: Call \`list_workspaces()\` to pick an appropriate workspace (or call \`create_workspace()\` if a dedicated space is needed).
  2. **Ingest the Link**: Call \`import_cloud_link(url=..., workspace_id=...)\` to download, process, and index the cloud resource.
  3. **Inspect Content & Schema**: Call \`read_file_content()\` for text documents or \`query_dataset(limit=5)\` for tabular files to understand the schema and distributions.
  4. **Deliver Structured Analysis**: Present an executive summary, key metrics, discovered patterns, and actionable takeaways clearly to the user.

### 2. RECONFIRM & VERIFY EVERY STATE MUTATION (CRITICAL)
- **MANDATORY VERIFICATION DIRECTIVE**:
  - Whenever you execute a state-changing operation (\`edit_dataset\`, \`create_workspace\`, \`upload_file\`, \`import_cloud_link\`, or \`delete_file\`), you MUST IMMEDIATELY programmatically verify that the action succeeded before reporting to the user:
    - After \`edit_dataset\`: Call \`query_dataset()\` to confirm that the row was added, updated, or removed.
    - After \`create_workspace\`: Call \`get_workspace()\` to confirm the workspace exists.
    - After \`import_cloud_link\` / \`upload_file\`: Call \`list_files()\` to verify the file status is \`READY\`.
- **Never claim a task is completed without programmatic verification.**

### 3. CONFIRM DESTRUCTIVE OPERATIONS
- When asked to delete a file (\`delete_file\`) or purge multiple records (\`edit_dataset\` action \`delete\`):
  - If the user's intent is broad or ambiguous, confirm the exact targets and record counts to prevent accidental data loss.

### 4. ZERO ASSUMPTIONS & EXPLICIT CLARITY
- **Never guess column names, data types, missing values, or metrics.**
- Always inspect the actual schema and sample rows first.
- If data is inconsistent or ambiguous, highlight the exact discrepancy to the user and offer recommendations.

### 5. RESPECT PRIVACY POLICIES & BOUNDARIES
- Redaction rules (\`[MASKED]\`, \`[REDACTED]\`) and dropped columns are enforced by POAIS privacy policies.
- Acknowledge redacted fields transparently and analyze all permitted data thoroughly.
`;

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Account MCP Credentials State
  const [accountCreds, setAccountCreds] = useState<AccountMCPCredential[]>([]);
  const [loadingAccountCreds, setLoadingAccountCreds] = useState(false);
  const [showCreateAccountKeyModal, setShowCreateAccountKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("AI Account Operator");
  const [newKeyExpiryDays, setNewKeyExpiryDays] = useState<number | null>(30);
  const [activePreset, setActivePreset] = useState<"assistant" | "operator" | "analyst" | "custom">("assistant");
  const [newKeyPermissions, setNewKeyPermissions] = useState<AccountMCPPermissions>({
    manage_workspaces: true,
    upload_files: true,
    read_data: true,
    query_dataset: true,
    edit_dataset: false,
    delete_files: false,
    manage_mcp_keys: true,
  });
  const [creatingKey, setCreatingKey] = useState(false);
  const [createdKeyResult, setCreatedKeyResult] = useState<AccountMCPCredentialCreated | null>(null);
  const [rotatingKeyId, setRotatingKeyId] = useState<string | null>(null);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);
  const [copiedPrefixId, setCopiedPrefixId] = useState<string | null>(null);

  // One-time Reveal Copy State
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedSkills, setCopiedSkills] = useState(false);

  // Account Activity State
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [accountActivity, setAccountActivity] = useState<AccountMCPActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityFilter, setActivityFilter] = useState("");

  // Delete Account Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
    loadAccountCredentials();
  }, []);

  const loadUser = async () => {
    try {
      setLoading(true);
      const me = await api.getMe();
      setUser(me);
      setFirstName(me.first_name || "");
      setLastName(me.last_name || "");
    } catch (err) {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadAccountCredentials = async () => {
    try {
      setLoadingAccountCreds(true);
      const creds = await api.getAccountMCPCredentials();
      setAccountCreds(creds);
    } catch (err) {
      console.error("Failed to load account MCP credentials", err);
    } finally {
      setLoadingAccountCreds(false);
    }
  };

  const loadAccountActivity = async () => {
    try {
      setLoadingActivity(true);
      const acts = await api.getAccountMCPActivity(100);
      setAccountActivity(acts);
    } catch (err) {
      console.error("Failed to load account activity", err);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastName.trim()) {
      setProfileMsg({ type: "error", text: "Last name is required." });
      return;
    }
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const updated = await api.updateMe({
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
      });
      setUser(updated);
      setProfileMsg({ type: "success", text: "Profile details updated successfully." });
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err.message || "Failed to update profile." });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "New passwords do not match." });
      return;
    }

    setSavingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setPasswordMsg({ type: "success", text: "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err.message || "Failed to change password." });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCreateAccountKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setCreatingKey(true);
    try {
      const res = await api.createAccountMCPCredential({
        name: newKeyName.trim(),
        permissions: newKeyPermissions,
        expires_in_days: newKeyExpiryDays,
      });
      setCreatedKeyResult(res);
      setShowCreateAccountKeyModal(false);
      await loadAccountCredentials();
    } catch (err: any) {
      alert(err.message || "Failed to create Account MCP Key.");
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRotateKey = async (id: string) => {
    if (!confirm("Are you sure you want to rotate this Account MCP Key? The previous token will be immediately revoked.")) {
      return;
    }
    setRotatingKeyId(id);
    try {
      const res = await api.rotateAccountMCPCredential(id);
      setCreatedKeyResult(res);
      await loadAccountCredentials();
    } catch (err: any) {
      alert(err.message || "Failed to rotate key.");
    } finally {
      setRotatingKeyId(null);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("Revoke this Account MCP Key immediately? All AI agents using this token will be disconnected.")) {
      return;
    }
    setRevokingKeyId(id);
    try {
      await api.revokeAccountMCPCredential(id);
      await loadAccountCredentials();
    } catch (err: any) {
      alert(err.message || "Failed to revoke key.");
    } finally {
      setRevokingKeyId(null);
    }
  };

  const handleDeleteRevokedKey = async (id: string) => {
    if (!confirm("Permanently delete this revoked MCP key record? This action cannot be undone.")) {
      return;
    }
    setDeletingKeyId(id);
    try {
      await api.deleteAccountMCPCredential(id);
      await loadAccountCredentials();
    } catch (err: any) {
      alert(err.message || "Failed to delete revoked key.");
    } finally {
      setDeletingKeyId(null);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword) return;

    setDeletingAccount(true);
    setDeleteError(null);
    try {
      await api.deleteAccount(deletePassword);
      router.push("/register?account_deleted=true");
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete account. Please verify your password.");
      setDeletingAccount(false);
    }
  };

  const applyPreset = (preset: "operator" | "assistant" | "analyst") => {
    setActivePreset(preset);
    if (preset === "operator") {
      setNewKeyPermissions({
        manage_workspaces: true,
        upload_files: true,
        read_data: true,
        query_dataset: true,
        edit_dataset: true,
        delete_files: true,
        manage_mcp_keys: true,
      });
    } else if (preset === "assistant") {
      setNewKeyPermissions({
        manage_workspaces: true,
        upload_files: true,
        read_data: true,
        query_dataset: true,
        edit_dataset: false,
        delete_files: false,
        manage_mcp_keys: true,
      });
    } else if (preset === "analyst") {
      setNewKeyPermissions({
        manage_workspaces: false,
        upload_files: false,
        read_data: true,
        query_dataset: true,
        edit_dataset: false,
        delete_files: false,
        manage_mcp_keys: false,
      });
    }
  };

  const setAllPermissions = (enabled: boolean) => {
    setActivePreset("custom");
    setNewKeyPermissions({
      manage_workspaces: enabled,
      upload_files: enabled,
      read_data: enabled,
      query_dataset: enabled,
      edit_dataset: enabled,
      delete_files: enabled,
      manage_mcp_keys: enabled,
    });
  };

  const handleCopyPrefix = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrefixId(id);
    setTimeout(() => setCopiedPrefixId(null), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "65vh" }}>
        <div style={{ color: "var(--text-tertiary)", fontSize: "0.95rem" }}>Loading settings...</div>
      </div>
    );
  }

  const apiBase = getApiBase();

  const PERMISSION_CONFIGS = [
    {
      key: "manage_workspaces",
      label: "Manage Workspaces",
      desc: "Create, inspect, and configure workspaces autonomously across your account.",
      icon: <Layers size={16} strokeWidth={1.5} />,
    },
    {
      key: "upload_files",
      label: "File Ingestion & Cloud Import",
      desc: "Upload files/images or convert shared Google Drive & Dropbox links into MCP resources.",
      icon: <UploadCloud size={16} strokeWidth={1.5} />,
    },
    {
      key: "read_data",
      label: "Read Documents & Schemas",
      desc: "Access extracted text, markdown content, and database schemas with PII anonymisation.",
      icon: <FileText size={16} strokeWidth={1.5} />,
    },
    {
      key: "query_dataset",
      label: "Query Tabular Datasets",
      desc: "Execute structured SQL-like queries, custom column projections, and aggregations.",
      icon: <Database size={16} strokeWidth={1.5} />,
    },
    {
      key: "edit_dataset",
      label: "Mutate Dataset Records",
      desc: "Insert new rows, update values, or modify records in tabular datasets.",
      icon: <Sliders size={16} strokeWidth={1.5} />,
    },
    {
      key: "delete_files",
      label: "Delete Workspace Files",
      desc: "Permanently remove documents or dataset files from workspaces.",
      icon: <Trash2 size={16} strokeWidth={1.5} />,
    },
    {
      key: "manage_mcp_keys",
      label: "Manage Workspace MCP Keys",
      desc: "Generate or revoke scoped workspace MCP credentials for specialized tasks.",
      icon: <Key size={16} strokeWidth={1.5} />,
    },
  ];

  return (
    <div style={{
      maxWidth: "960px",
      margin: "0 auto",
      padding: "clamp(2rem, 4vw, 3rem) clamp(1rem, 3vw, 1.5rem) 5rem clamp(1rem, 3vw, 1.5rem)",
    }}>
      {/* Header Banner */}
      <div style={{
        marginBottom: "2.5rem",
        paddingBottom: "1.5rem",
        borderBottom: "1px solid rgba(40, 40, 40, 0.04)",
      }}>
        <div className="slash-tag">ACCOUNT PREFERENCES</div>
        <h1 className="font-hero" style={{ fontSize: "clamp(1.85rem, 3.5vw, 2.5rem)", letterSpacing: "-0.04em", color: "var(--text-primary)" }}>
          User Settings
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginTop: "0.25rem", fontWeight: 400 }}>
          Manage your identity, security credentials, Account Master MCP automation tokens, and privacy preferences.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Card 1: Account-Level Master MCP Access & AI Agent Automation */}
        <div className="frosted-panel" style={{ padding: "clamp(1.5rem, 3.5vw, 2.25rem)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "1.25rem", marginBottom: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem", maxWidth: "600px" }}>
              <div className="icon-circle-btn" style={{ width: "42px", height: "42px", background: "rgba(46, 48, 50, 0.06)", color: "var(--text-primary)", flexShrink: 0 }}>
                <Bot size={20} strokeWidth={1.5} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <h2 style={{ fontSize: "1.22rem", fontWeight: 500, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                    Account Master MCP Access
                  </h2>
                </div>
                <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginTop: "0.25rem", lineHeight: 1.45 }}>
                  Generate master MCP credentials allowing AI agents to create workspaces, ingest files & cloud links, query datasets, and manage keys under strict policy governance.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  loadAccountActivity();
                  setShowActivityModal(true);
                }}
                className="pill-btn pill-btn-glass"
                style={{ fontSize: "0.82rem", gap: "0.4rem", padding: "0.5rem 0.95rem" }}
              >
                <Activity size={14} strokeWidth={1.5} />
                <span>Activity Logs</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewKeyName("AI Account Operator");
                  setNewKeyExpiryDays(30);
                  applyPreset("assistant");
                  setShowCreateAccountKeyModal(true);
                }}
                className="pill-btn pill-btn-solid"
                style={{ fontSize: "0.82rem", gap: "0.4rem", padding: "0.5rem 1rem" }}
              >
                <Plus size={14} strokeWidth={2} />
                <span>Generate Master MCP Key</span>
              </button>
            </div>
          </div>

          {/* Account MCP Keys List */}
          {loadingAccountCreds ? (
            <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-tertiary)", fontSize: "0.88rem" }}>
              <RefreshCw size={18} className="animate-spin" style={{ margin: "0 auto 0.5rem", display: "block" }} />
              Loading Account MCP Keys...
            </div>
          ) : accountCreds.length === 0 ? (
            <div style={{
              padding: "2.5rem 1.5rem",
              borderRadius: "var(--radius-lg)",
              border: "1px dashed rgba(40, 40, 40, 0.15)",
              background: "rgba(0, 0, 0, 0.015)",
              textAlign: "center",
            }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "rgba(46, 48, 50, 0.06)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "0.85rem",
                color: "var(--text-secondary)",
              }}>
                <KeyRound size={20} strokeWidth={1.5} />
              </div>
              <h3 style={{ fontSize: "1rem", fontWeight: 500, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                No Account Master MCP Keys Created
              </h3>
              <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", maxWidth: "480px", margin: "0 auto 1.35rem", lineHeight: 1.5 }}>
                Connect your AI assistants and tools directly to your entire account with granular security and privacy constraints.
              </p>
              <button
                type="button"
                onClick={() => {
                  setNewKeyName("AI Account Operator");
                  setNewKeyExpiryDays(30);
                  applyPreset("assistant");
                  setShowCreateAccountKeyModal(true);
                }}
                className="pill-btn pill-btn-solid"
                style={{ fontSize: "0.82rem", gap: "0.4rem", padding: "0.5rem 1.1rem", margin: "0 auto" }}
              >
                <Sparkles size={13} />
                <span>Create Your First Account Key</span>
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {accountCreds.map((cred) => {
                const perms = cred.permissions || {};
                const fullConnectorUrl = `${apiBase}/mcp?token=${cred.credential_prefix}...`;
                return (
                  <div
                    key={cred.id}
                    style={{
                      padding: "1.25rem 1.4rem",
                      borderRadius: "var(--radius-lg)",
                      border: "1px solid rgba(40, 40, 40, 0.08)",
                      background: cred.is_active ? "#FFFFFF" : "rgba(0, 0, 0, 0.02)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.85rem",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                    }}
                  >
                    {/* Top Row: Name, Status, and Action Buttons */}
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "1rem", fontWeight: 500, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                          {cred.name}
                        </span>
                        <span style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "0.15rem 0.55rem",
                          borderRadius: "var(--radius-pill)",
                          background: cred.is_active ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                          color: cred.is_active ? "#059669" : "#DC2626",
                          border: cred.is_active ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                        }}>
                          <span style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: cred.is_active ? "#10B981" : "#EF4444",
                          }} />
                          {cred.is_active ? "Active" : "Revoked"}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {cred.is_active ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRotateKey(cred.id)}
                              disabled={rotatingKeyId === cred.id}
                              className="pill-btn pill-btn-glass pill-btn-sm"
                              style={{ gap: "0.35rem" }}
                              title="Rotate key: generates a new raw token and revokes the old one"
                            >
                              <RotateCw size={12} className={rotatingKeyId === cred.id ? "animate-spin" : ""} />
                              <span>{rotatingKeyId === cred.id ? "Rotating..." : "Rotate"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRevokeKey(cred.id)}
                              disabled={revokingKeyId === cred.id}
                              className="pill-btn pill-btn-sm"
                              style={{
                                background: "rgba(239, 68, 68, 0.06)",
                                color: "#DC2626",
                                border: "1px solid rgba(239, 68, 68, 0.18)",
                                fontWeight: 500,
                                gap: "0.35rem",
                              }}
                            >
                              <Trash2 size={12} />
                              <span>{revokingKeyId === cred.id ? "Revoking..." : "Revoke"}</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteRevokedKey(cred.id)}
                            disabled={deletingKeyId === cred.id}
                            className="pill-btn pill-btn-sm"
                            style={{
                              background: "rgba(239, 68, 68, 0.08)",
                              color: "#DC2626",
                              border: "1px solid rgba(239, 68, 68, 0.2)",
                              fontWeight: 500,
                              gap: "0.35rem",
                              fontSize: "0.75rem",
                            }}
                            title="Permanently remove this revoked key record"
                          >
                            <Trash2 size={12} />
                            <span>{deletingKeyId === cred.id ? "Deleting..." : "Delete Key"}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Full MCP Connector URL with 1-Click Copy & Metadata */}
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem", fontSize: "0.78rem" }}>
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.45rem",
                        background: "rgba(46, 48, 50, 0.04)",
                        border: "1px solid rgba(46, 48, 50, 0.08)",
                        borderRadius: "var(--radius-sm)",
                        padding: "0.22rem 0.6rem",
                        maxWidth: "100%",
                      }}>
                        <Globe size={13} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                        <code style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: "0.76rem",
                          color: "var(--text-primary)",
                          letterSpacing: "-0.01em",
                          wordBreak: "break-all",
                        }}>
                          {fullConnectorUrl}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopyPrefix(cred.id, fullConnectorUrl)}
                          title="Copy MCP Connector URL"
                          style={{
                            background: "none",
                            border: "none",
                            padding: "0.15rem 0.35rem",
                            cursor: "pointer",
                            color: copiedPrefixId === cred.id ? "#059669" : "var(--text-secondary)",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontSize: "0.72rem",
                            fontWeight: 500,
                            flexShrink: 0,
                          }}
                        >
                          {copiedPrefixId === cred.id ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedPrefixId === cred.id ? "Copied Link!" : "Copy Link"}</span>
                        </button>
                      </div>

                      <span style={{ color: "var(--text-tertiary)" }}>
                        Created: {new Date(cred.created_at).toLocaleDateString()}
                      </span>

                      {cred.expires_at && (
                        <span style={{ color: "var(--text-tertiary)" }}>
                          • Expires: {new Date(cred.expires_at).toLocaleDateString()}
                        </span>
                      )}

                      {cred.last_used_at && (
                        <span style={{ color: "var(--text-tertiary)" }}>
                          • Last used: {new Date(cred.last_used_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Bottom Row: Granular Permission Badges */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", paddingTop: "0.25rem" }}>
                      {perms.manage_workspaces && (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          background: "rgba(46, 48, 50, 0.04)",
                          border: "1px solid rgba(46, 48, 50, 0.08)",
                          color: "var(--text-primary)",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "var(--radius-pill)",
                          fontSize: "0.72rem",
                          fontWeight: 500,
                        }}>
                          <Layers size={12} strokeWidth={1.75} style={{ color: "var(--text-secondary)" }} />
                          <span>Workspaces</span>
                        </span>
                      )}
                      {perms.upload_files && (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          background: "rgba(46, 48, 50, 0.04)",
                          border: "1px solid rgba(46, 48, 50, 0.08)",
                          color: "var(--text-primary)",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "var(--radius-pill)",
                          fontSize: "0.72rem",
                          fontWeight: 500,
                        }}>
                          <UploadCloud size={12} strokeWidth={1.75} style={{ color: "var(--text-secondary)" }} />
                          <span>Ingest & Cloud</span>
                        </span>
                      )}
                      {perms.read_data && (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          background: "rgba(46, 48, 50, 0.04)",
                          border: "1px solid rgba(46, 48, 50, 0.08)",
                          color: "var(--text-primary)",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "var(--radius-pill)",
                          fontSize: "0.72rem",
                          fontWeight: 500,
                        }}>
                          <FileText size={12} strokeWidth={1.75} style={{ color: "var(--text-secondary)" }} />
                          <span>Read Data</span>
                        </span>
                      )}
                      {perms.query_dataset && (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          background: "rgba(46, 48, 50, 0.04)",
                          border: "1px solid rgba(46, 48, 50, 0.08)",
                          color: "var(--text-primary)",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "var(--radius-pill)",
                          fontSize: "0.72rem",
                          fontWeight: 500,
                        }}>
                          <Database size={12} strokeWidth={1.75} style={{ color: "var(--text-secondary)" }} />
                          <span>SQL Query</span>
                        </span>
                      )}
                      {perms.edit_dataset && (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          background: "rgba(46, 48, 50, 0.04)",
                          border: "1px solid rgba(46, 48, 50, 0.08)",
                          color: "var(--text-primary)",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "var(--radius-pill)",
                          fontSize: "0.72rem",
                          fontWeight: 500,
                        }}>
                          <Sliders size={12} strokeWidth={1.75} style={{ color: "var(--text-secondary)" }} />
                          <span>Mutate Records</span>
                        </span>
                      )}
                      {perms.delete_files && (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          background: "rgba(46, 48, 50, 0.04)",
                          border: "1px solid rgba(46, 48, 50, 0.08)",
                          color: "var(--text-primary)",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "var(--radius-pill)",
                          fontSize: "0.72rem",
                          fontWeight: 500,
                        }}>
                          <Trash2 size={12} strokeWidth={1.75} style={{ color: "var(--text-secondary)" }} />
                          <span>Delete Files</span>
                        </span>
                      )}
                      {perms.manage_mcp_keys && (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          background: "rgba(46, 48, 50, 0.04)",
                          border: "1px solid rgba(46, 48, 50, 0.08)",
                          color: "var(--text-primary)",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "var(--radius-pill)",
                          fontSize: "0.72rem",
                          fontWeight: 500,
                        }}>
                          <Key size={12} strokeWidth={1.75} style={{ color: "var(--text-secondary)" }} />
                          <span>Delegate Keys</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Card 2: Profile & Identity */}
        <div className="frosted-panel" style={{ padding: "clamp(1.5rem, 3.5vw, 2.25rem)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "1.25rem" }}>
            <div className="icon-circle-btn" style={{ width: "38px", height: "38px" }}>
              <UserIcon size={16} strokeWidth={1.5} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.18rem", fontWeight: 500, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                Profile & Identity
              </h2>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Your names are used for workspace greeting and audit records.
              </p>
            </div>
          </div>

          {profileMsg && (
            <div style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-sm)",
              background: profileMsg.type === "success" ? "var(--status-allow-bg)" : "var(--status-deny-bg)",
              color: profileMsg.type === "success" ? "var(--status-allow)" : "var(--status-deny)",
              fontSize: "0.84rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}>
              {profileMsg.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 500, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                  Username
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={user?.username || ""}
                  className="modern-input"
                  style={{ opacity: 0.75, cursor: "not-allowed", background: "rgba(0, 0, 0, 0.02)" }}
                />
                <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: "0.2rem", display: "block" }}>
                  Usernames are unique and permanent.
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 500, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                  First Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ali"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="modern-input"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 500, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                  Last Name <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hassan"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="modern-input"
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={savingProfile || !lastName.trim()}
                className="pill-btn pill-btn-solid"
              >
                {savingProfile ? "Saving..." : "Save Profile Changes"}
                <ArrowRight size={14} strokeWidth={1.5} />
              </button>
            </div>
          </form>
        </div>

        {/* Card 3: Security & Password */}
        <div className="frosted-panel" style={{ padding: "clamp(1.5rem, 3.5vw, 2.25rem)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "1.25rem" }}>
            <div className="icon-circle-btn" style={{ width: "38px", height: "38px" }}>
              <KeyRound size={16} strokeWidth={1.5} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.18rem", fontWeight: 500, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                Password & Authentication
              </h2>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Update your account password to maintain maximum gateway protection.
              </p>
            </div>
          </div>

          {passwordMsg && (
            <div style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-sm)",
              background: passwordMsg.type === "success" ? "var(--status-allow-bg)" : "var(--status-deny-bg)",
              color: passwordMsg.type === "success" ? "var(--status-allow)" : "var(--status-deny)",
              fontSize: "0.84rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}>
              {passwordMsg.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 500, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="modern-input"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 500, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="modern-input"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 500, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="modern-input"
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="pill-btn pill-btn-solid"
              >
                {savingPassword ? "Updating..." : "Update Password"}
                <Lock size={13} strokeWidth={1.5} />
              </button>
            </div>
          </form>
        </div>

        {/* Card 4: Session & Security Status */}
        <div className="frosted-panel" style={{ padding: "clamp(1.5rem, 3.5vw, 2.25rem)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "1.25rem" }}>
            <div className="icon-circle-btn" style={{ width: "38px", height: "38px" }}>
              <ShieldCheck size={16} strokeWidth={1.5} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.18rem", fontWeight: 500, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                Session & Metadata
              </h2>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Cryptographic security session state and tenant details.
              </p>
            </div>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            padding: "1.1rem",
            background: "rgba(0, 0, 0, 0.02)",
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(40, 40, 40, 0.04)",
            marginBottom: "1.25rem",
          }}>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>User ID</div>
              <div style={{ fontSize: "0.84rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-primary)", marginTop: "0.2rem" }}>
                {user?.id ? `${user.id.slice(0, 12)}...` : "-"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Account Created</div>
              <div style={{ fontSize: "0.84rem", color: "var(--text-primary)", marginTop: "0.2rem" }}>
                {user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { dateStyle: "medium" }) : "-"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Access Status</div>
              <div style={{ fontSize: "0.84rem", color: "var(--status-allow)", fontWeight: 500, marginTop: "0.2rem" }}>
                ● Active (Token Signed)
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => api.logout()}
              className="pill-btn pill-btn-glass"
              style={{ gap: "0.4rem" }}
            >
              <LogOut size={14} strokeWidth={1.5} />
              <span>Sign Out of Device</span>
            </button>
          </div>
        </div>

        {/* Card 5: Danger Zone (Account Deletion) */}
        <div style={{
          padding: "clamp(1.5rem, 3.5vw, 2.25rem)",
          borderRadius: "var(--radius-xl)",
          background: "rgba(239, 68, 68, 0.03)",
          border: "1px solid rgba(239, 68, 68, 0.18)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "1rem" }}>
            <div className="icon-circle-btn" style={{ width: "38px", height: "38px", color: "#EF4444", background: "rgba(239, 68, 68, 0.1)" }}>
              <ShieldAlert size={16} strokeWidth={1.5} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.18rem", fontWeight: 500, color: "#EF4444", letterSpacing: "-0.02em" }}>
                Danger Zone
              </h2>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Irreversible account and tenant data destruction.
              </p>
            </div>
          </div>

          <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "1.25rem" }}>
            Permanently delete your account. This action is <strong>irreversible</strong>. When deleted, all your owned workspaces, uploaded documents, extracted contents, storage files, MCP credentials, and access policies will be <strong>permanently purged and wiped</strong>.
          </p>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                setDeletePassword("");
                setDeleteError(null);
                setShowDeleteModal(true);
              }}
              className="pill-btn"
              style={{
                background: "#EF4444",
                color: "#FFFFFF",
                border: "none",
                fontWeight: 500,
                gap: "0.4rem",
              }}
            >
              <ShieldAlert size={14} strokeWidth={1.5} />
              <span>Delete User Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Create Account Master MCP Key (Clean, Responsive Design)         */}
      {/* ========================================================================= */}
      {showCreateAccountKeyModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateAccountKeyModal(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 10, 10, 0.5)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "clamp(1.5rem, 5vh, 3rem) clamp(1rem, 3vw, 2rem)",
            overflowY: "auto",
          }}
        >
          <div style={{
            width: "100%",
            maxWidth: "600px",
            maxHeight: "min(86vh, 720px)",
            background: "#FFFFFF",
            borderRadius: "var(--radius-xl)",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.06)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            position: "relative",
            margin: "auto",
            animation: "fadeIn 0.2s ease-out",
          }}>
            {/* Header */}
            <div style={{
              padding: "1.5rem 1.75rem 1rem 1.75rem",
              borderBottom: "1px solid rgba(40, 40, 40, 0.06)",
              background: "#FFFFFF",
              position: "relative",
              flexShrink: 0,
            }}>
              <button
                type="button"
                onClick={() => setShowCreateAccountKeyModal(false)}
                className="icon-circle-btn"
                style={{
                  position: "absolute",
                  top: "1.25rem",
                  right: "1.25rem",
                  width: "32px",
                  height: "32px",
                  zIndex: 10,
                }}
                title="Close modal"
              >
                <X size={14} strokeWidth={1.5} />
              </button>

              <div className="slash-tag">ACCOUNT MCP TOKEN CREATOR</div>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 400, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
                Generate Master MCP Token
              </h2>
              <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                Issue an account-level token allowing AI assistants to interact with your workspace resources.
              </p>
            </div>

            {/* Scrollable Form Body */}
            <div style={{
              padding: "1.25rem 1.75rem",
              overflowY: "auto",
              flex: "1 1 auto",
            }}>
              <form id="create-account-mcp-form" onSubmit={handleCreateAccountKey}>
                {/* Quick Presets */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 500, textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "0.4rem", letterSpacing: "0.04em" }}>
                    Quick Permission Presets
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.45rem" }}>
                    <button
                      type="button"
                      onClick={() => applyPreset("assistant")}
                      style={{
                        padding: "0.5rem 0.75rem",
                        borderRadius: "var(--radius-sm)",
                        border: activePreset === "assistant" ? "1.5px solid #2E3032" : "1px solid rgba(40, 40, 40, 0.08)",
                        background: activePreset === "assistant" ? "#2E3032" : "var(--bg-page)",
                        color: activePreset === "assistant" ? "#FFFFFF" : "var(--text-primary)",
                        fontSize: "0.78rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        justifyContent: "center",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Bot size={13} />
                      <span>Standard Assistant</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset("operator")}
                      style={{
                        padding: "0.5rem 0.75rem",
                        borderRadius: "var(--radius-sm)",
                        border: activePreset === "operator" ? "1.5px solid #2E3032" : "1px solid rgba(40, 40, 40, 0.08)",
                        background: activePreset === "operator" ? "#2E3032" : "var(--bg-page)",
                        color: activePreset === "operator" ? "#FFFFFF" : "var(--text-primary)",
                        fontSize: "0.78rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        justifyContent: "center",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Sparkles size={13} />
                      <span>Full Operator</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset("analyst")}
                      style={{
                        padding: "0.5rem 0.75rem",
                        borderRadius: "var(--radius-sm)",
                        border: activePreset === "analyst" ? "1.5px solid #2E3032" : "1px solid rgba(40, 40, 40, 0.08)",
                        background: activePreset === "analyst" ? "#2E3032" : "var(--bg-page)",
                        color: activePreset === "analyst" ? "#FFFFFF" : "var(--text-primary)",
                        fontSize: "0.78rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        justifyContent: "center",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Database size={13} />
                      <span>Read & Query Only</span>
                    </button>
                  </div>
                </div>

                {/* Key Name & Expiration Inputs */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 500, textTransform: "uppercase", marginBottom: "0.35rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                      Key Label
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AI Account Operator"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="modern-input"
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 500, textTransform: "uppercase", marginBottom: "0.35rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                      Expiration
                    </label>
                    <select
                      value={newKeyExpiryDays === null ? "never" : newKeyExpiryDays.toString()}
                      onChange={(e) => setNewKeyExpiryDays(e.target.value === "never" ? null : parseInt(e.target.value))}
                      className="modern-input"
                      style={{ padding: "0.6rem 0.5rem" }}
                    >
                      <option value="30">30 Days</option>
                      <option value="90">90 Days</option>
                      <option value="365">1 Year</option>
                      <option value="never">Never</option>
                    </select>
                  </div>
                </div>

                {/* Granular Tool Access Permissions Matrix */}
                <div style={{
                  background: "var(--bg-page)",
                  border: "1px solid rgba(40, 40, 40, 0.05)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1rem",
                  marginBottom: "0.5rem",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <div style={{ fontSize: "0.74rem", fontWeight: 500, textTransform: "uppercase", color: "var(--text-primary)", letterSpacing: "0.04em" }}>
                      Granular Tool Permissions
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => setAllPermissions(true)}
                        style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline" }}
                      >
                        Select All
                      </button>
                      <span style={{ color: "var(--text-tertiary)", fontSize: "0.72rem" }}>•</span>
                      <button
                        type="button"
                        onClick={() => setAllPermissions(false)}
                        style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline" }}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                    {PERMISSION_CONFIGS.map((item) => {
                      const isChecked = !!(newKeyPermissions as any)[item.key];
                      return (
                        <div
                          key={item.key}
                          onClick={() => {
                            setActivePreset("custom");
                            setNewKeyPermissions({ ...newKeyPermissions, [item.key]: !isChecked });
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0.6rem 0.8rem",
                            borderRadius: "var(--radius-md)",
                            border: isChecked ? "1.5px solid #2E3032" : "1px solid rgba(40, 40, 40, 0.05)",
                            background: isChecked ? "#FFFFFF" : "rgba(255, 255, 255, 0.5)",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", maxWidth: "450px" }}>
                            <div style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "var(--radius-sm)",
                              background: isChecked ? "#2E3032" : "rgba(0,0,0,0.04)",
                              color: isChecked ? "#FFFFFF" : "var(--text-tertiary)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              transition: "all 0.15s ease",
                            }}>
                              {item.icon}
                            </div>
                            <div>
                              <div style={{ fontSize: "0.85rem", fontWeight: isChecked ? 500 : 400, color: "var(--text-primary)" }}>
                                {item.label}
                              </div>
                              <div style={{ fontSize: "0.73rem", color: "var(--text-secondary)", marginTop: "0.1rem", lineHeight: 1.3 }}>
                                {item.desc}
                              </div>
                            </div>
                          </div>

                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              setActivePreset("custom");
                              setNewKeyPermissions({ ...newKeyPermissions, [item.key]: e.target.checked });
                            }}
                            style={{
                              width: "16px",
                              height: "16px",
                              accentColor: "#2E3032",
                              cursor: "pointer",
                              flexShrink: 0,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div style={{
              padding: "1rem 1.75rem 1.35rem 1.75rem",
              borderTop: "1px solid rgba(40, 40, 40, 0.06)",
              background: "#FFFFFF",
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              flexShrink: 0,
            }}>
              <button
                type="button"
                onClick={() => setShowCreateAccountKeyModal(false)}
                className="pill-btn pill-btn-glass"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-account-mcp-form"
                disabled={creatingKey || !newKeyName.trim()}
                className="pill-btn pill-btn-solid"
                style={{ gap: "0.4rem" }}
              >
                {creatingKey ? "Generating Key..." : "Generate Master Key"}
                <Sparkles size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: One-Time Token Reveal Modal (Cleaned & Aligned Design)           */}
      {/* ========================================================================= */}
      {createdKeyResult && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreatedKeyResult(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 10, 10, 0.5)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "clamp(1.5rem, 5vh, 3rem) clamp(1rem, 3vw, 2rem)",
            overflowY: "auto",
          }}
        >
          <div style={{
            width: "100%",
            maxWidth: "600px",
            maxHeight: "min(86vh, 720px)",
            background: "#FFFFFF",
            borderRadius: "var(--radius-xl)",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.06)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            position: "relative",
            margin: "auto",
            animation: "fadeIn 0.2s ease-out",
          }}>
            {/* Header */}
            <div style={{
              padding: "1.5rem 1.75rem 1.25rem 1.75rem",
              borderBottom: "1px solid rgba(40, 40, 40, 0.06)",
              background: "#FFFFFF",
              position: "relative",
              flexShrink: 0,
            }}>
              <button
                type="button"
                onClick={() => setCreatedKeyResult(null)}
                className="icon-circle-btn"
                style={{
                  position: "absolute",
                  top: "1.25rem",
                  right: "1.25rem",
                  width: "32px",
                  height: "32px",
                  zIndex: 10,
                }}
                title="Close modal"
              >
                <X size={14} strokeWidth={1.5} />
              </button>

              <div className="slash-tag">ACCOUNT MCP TOKEN READY</div>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 400, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: "0.4rem" }}>
                Your Master Account MCP Token
              </h2>
              <p style={{
                fontSize: "0.8rem",
                color: "var(--status-deny)",
                background: "var(--status-deny-bg)",
                padding: "0.35rem 0.85rem",
                borderRadius: "var(--radius-pill)",
                display: "inline-block",
                border: "1px solid rgba(194, 65, 12, 0.15)",
                margin: 0,
              }}>
                Copy this token now. It cannot be recovered after closing this window.
              </p>
            </div>

            {/* Scrollable Content Body */}
            <div style={{
              padding: "1.35rem 1.75rem",
              overflowY: "auto",
              flex: "1 1 auto",
            }}>
              {/* Section 1: Direct AI Web Connector URL */}
              <div style={{ marginBottom: "1.35rem" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", color: "var(--text-primary)", marginBottom: "0.35rem", letterSpacing: "0.04em" }}>
                  1. Direct AI Web Connector URL
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    readOnly
                    value={`${apiBase}/mcp?token=${createdKeyResult.raw_token}`}
                    className="modern-input"
                    style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem", background: "var(--bg-page)", flex: "1 1 200px" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${apiBase}/mcp?token=${createdKeyResult.raw_token}`);
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2000);
                    }}
                    className="pill-btn pill-btn-solid"
                    style={{ padding: "0 1.15rem", gap: "0.35rem" }}
                  >
                    {copiedUrl ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} />}
                    <span>{copiedUrl ? "Copied URL" : "Copy URL"}</span>
                  </button>
                </div>
                <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
                  Paste this into any web-based AI assistant with <strong>Authentication: None</strong> to connect directly.
                </div>
              </div>

              {/* Section 2: Bearer Authentication Token */}
              <div style={{ marginBottom: "1.35rem" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "0.35rem", letterSpacing: "0.04em" }}>
                  2. Bearer Authentication Token
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    readOnly
                    value={createdKeyResult.raw_token}
                    className="modern-input"
                    style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem", flex: "1 1 200px" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdKeyResult.raw_token);
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 2000);
                    }}
                    className="pill-btn pill-btn-glass"
                    style={{ padding: "0 1.15rem", gap: "0.35rem" }}
                  >
                    {copiedToken ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} />}
                    <span>{copiedToken ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              {/* Section 3: AI Client JSON Configuration */}
              <div style={{ marginBottom: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                    3. AI Client JSON Configuration
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const configJson = JSON.stringify(
                        {
                          mcpServers: {
                            "poais-master-account": {
                              url: `${apiBase}/mcp`,
                              headers: {
                                Authorization: `Bearer ${createdKeyResult.raw_token}`,
                              },
                            },
                          },
                        },
                        null,
                        2
                      );
                      navigator.clipboard.writeText(configJson);
                      setCopiedJson(true);
                      setTimeout(() => setCopiedJson(false), 2000);
                    }}
                    className="pill-btn pill-btn-glass"
                    style={{ padding: "0.2rem 0.65rem", fontSize: "0.74rem", gap: "0.3rem" }}
                  >
                    {copiedJson ? <Check size={12} strokeWidth={1.5} /> : <Copy size={12} strokeWidth={1.5} />}
                    <span>{copiedJson ? "Copied" : "Copy JSON"}</span>
                  </button>
                </div>
                <div style={{
                  padding: "0.85rem 1.1rem",
                  background: "#2E3032",
                  borderRadius: "var(--radius-md)",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "0.78rem",
                  overflowX: "auto",
                  color: "#FFE63C",
                }}>
                  <pre style={{ margin: 0 }}>{JSON.stringify(
                    {
                      mcpServers: {
                        "poais-master-account": {
                          url: `${apiBase}/mcp`,
                          headers: {
                            Authorization: `Bearer ${createdKeyResult.raw_token}`,
                          },
                        },
                      },
                    },
                    null,
                    2
                  )}</pre>
                </div>
              </div>

              {/* Section 4: AI Agent Skills File & Autonomous Directives */}
              <div style={{ marginBottom: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem", flexWrap: "wrap", gap: "0.4rem" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                    4. AI Agent Skills & Operational Directives
                  </div>
                  <div style={{ display: "flex", gap: "0.35rem" }}>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(POAIS_ACCOUNT_AI_SKILLS_MARKDOWN);
                        setCopiedSkills(true);
                        setTimeout(() => setCopiedSkills(false), 2000);
                      }}
                      className="pill-btn pill-btn-glass"
                      style={{ padding: "0.2rem 0.65rem", fontSize: "0.74rem", gap: "0.3rem" }}
                    >
                      {copiedSkills ? <Check size={12} strokeWidth={1.5} /> : <Copy size={12} strokeWidth={1.5} />}
                      <span>{copiedSkills ? "Copied Skills!" : "Copy Skills Prompt"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([POAIS_ACCOUNT_AI_SKILLS_MARKDOWN], { type: "text/markdown" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "POAIS_ACCOUNT_AGENT_SKILLS.md";
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="pill-btn pill-btn-glass"
                      style={{ padding: "0.2rem 0.65rem", fontSize: "0.74rem", gap: "0.3rem" }}
                    >
                      <Download size={12} strokeWidth={1.5} />
                      <span>Download .md</span>
                    </button>
                  </div>
                </div>
                <div style={{
                  padding: "0.85rem 1rem",
                  background: "var(--bg-page)",
                  border: "1px solid rgba(40, 40, 40, 0.05)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.76rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                }}>
                  <div style={{ fontWeight: 500, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                    ⚡ Key AI Autonomous Directives & Best Practices:
                  </div>
                  <ul style={{ margin: "0 0 0 1.1rem", padding: 0, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <li>
                      <strong>Autonomous Link Ingestion & Analysis:</strong> When given Google Drive, Dropbox, or web links, the AI is instructed to autonomously ingest the data with <code>import_cloud_link</code>, inspect its schema, run analytical queries, and deliver an executive report.
                    </li>
                    <li>
                      <strong>Mandatory Self-Verification:</strong> Whenever the AI executes <code>edit_dataset</code>, <code>create_workspace</code>, or file actions, it is strictly required to verify persistence with a query before replying.
                    </li>
                    <li>
                      <strong>Confirmation & Zero Assumptions:</strong> Destructive operations require confirmation; columns and data types must always be inspected first.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: "1rem 1.75rem 1.35rem 1.75rem",
              borderTop: "1px solid rgba(40, 40, 40, 0.06)",
              background: "#FFFFFF",
              display: "flex",
              justifyContent: "flex-end",
              flexShrink: 0,
            }}>
              <button
                type="button"
                onClick={() => setCreatedKeyResult(null)}
                className="pill-btn pill-btn-solid"
                style={{ width: "100%", padding: "0.75rem" }}
              >
                Done, I Have Saved This Token
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Account Activity Audit Logs (Clean & Responsive)                 */}
      {/* ========================================================================= */}
      {showActivityModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowActivityModal(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 10, 10, 0.5)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "clamp(1.5rem, 5vh, 3rem) clamp(1rem, 3vw, 2rem)",
            overflowY: "auto",
          }}
        >
          <div style={{
            width: "100%",
            maxWidth: "760px",
            maxHeight: "min(86vh, 740px)",
            background: "#FFFFFF",
            borderRadius: "var(--radius-xl)",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.06)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            position: "relative",
            margin: "auto",
            animation: "fadeIn 0.2s ease-out",
          }}>
            {/* Header */}
            <div style={{
              padding: "1.5rem 1.75rem 1rem 1.75rem",
              borderBottom: "1px solid rgba(40, 40, 40, 0.06)",
              background: "#FFFFFF",
              position: "relative",
              flexShrink: 0,
            }}>
              <button
                type="button"
                onClick={() => setShowActivityModal(false)}
                className="icon-circle-btn"
                style={{
                  position: "absolute",
                  top: "1.25rem",
                  right: "1.25rem",
                  width: "32px",
                  height: "32px",
                  zIndex: 10,
                }}
                title="Close modal"
              >
                <X size={14} strokeWidth={1.5} />
              </button>

              <div className="slash-tag">MCP AUDIT LOGS</div>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 400, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
                Account Master MCP Activity
              </h2>
              <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>
                Live audit trail of operations executed through your account-level Master MCP credentials.
              </p>
            </div>

            {/* Filter Bar */}
            <div style={{
              padding: "0.75rem 1.75rem",
              background: "var(--bg-page)",
              borderBottom: "1px solid rgba(40, 40, 40, 0.05)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexShrink: 0,
            }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
                <input
                  type="text"
                  placeholder="Filter by operation or details..."
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  className="modern-input"
                  style={{ paddingLeft: "2.1rem", fontSize: "0.8rem", paddingBlock: "0.45rem", background: "#FFFFFF" }}
                />
              </div>

              <button
                type="button"
                onClick={loadAccountActivity}
                disabled={loadingActivity}
                className="pill-btn pill-btn-glass"
                style={{ fontSize: "0.78rem", gap: "0.35rem", padding: "0.45rem 0.85rem", whiteSpace: "nowrap" }}
              >
                <RefreshCw size={12} className={loadingActivity ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Scrollable Table Body */}
            <div style={{
              flex: "1 1 auto",
              overflowY: "auto",
              padding: "0 1.75rem",
            }}>
              {loadingActivity ? (
                <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-tertiary)", fontSize: "0.85rem" }}>
                  <RefreshCw size={18} className="animate-spin" style={{ margin: "0 auto 0.5rem", display: "block" }} />
                  Loading activity records...
                </div>
              ) : (() => {
                const filtered = accountActivity.filter((act) => {
                  if (!activityFilter.trim()) return true;
                  const q = activityFilter.toLowerCase();
                  return (
                    act.operation.toLowerCase().includes(q) ||
                    (act.reason && act.reason.toLowerCase().includes(q)) ||
                    act.decision.toLowerCase().includes(q)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div style={{ textAlign: "center", padding: "3rem 1.5rem", color: "var(--text-tertiary)", fontSize: "0.85rem" }}>
                      No account-level MCP operations matched your filter.
                    </div>
                  );
                }

                return (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(40, 40, 40, 0.08)", color: "var(--text-secondary)" }}>
                        <th style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>Timestamp</th>
                        <th style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>Operation</th>
                        <th style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>Decision</th>
                        <th style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>Details & Rationale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((act) => (
                        <tr key={act.id} style={{ borderBottom: "1px solid rgba(40, 40, 40, 0.04)" }}>
                          <td style={{ padding: "0.65rem 0.5rem", whiteSpace: "nowrap", color: "var(--text-tertiary)", fontSize: "0.76rem" }}>
                            {new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </td>
                          <td style={{ padding: "0.65rem 0.5rem", fontWeight: 500, color: "var(--text-primary)" }}>
                            <code style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.74rem", background: "rgba(0,0,0,0.03)", padding: "0.15rem 0.35rem", borderRadius: "3px" }}>
                              {act.operation}
                            </code>
                          </td>
                          <td style={{ padding: "0.65rem 0.5rem" }}>
                            <span style={{
                              fontSize: "0.68rem",
                              fontWeight: 600,
                              padding: "0.12rem 0.45rem",
                              borderRadius: "var(--radius-pill)",
                              background: act.decision === "ALLOW" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                              color: act.decision === "ALLOW" ? "#059669" : "#DC2626",
                            }}>
                              {act.decision}
                            </span>
                          </td>
                          <td style={{ padding: "0.65rem 0.5rem", color: "var(--text-secondary)", maxWidth: "280px", lineHeight: 1.35 }}>
                            {act.reason || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Footer */}
            <div style={{
              padding: "1rem 1.75rem 1.35rem 1.75rem",
              borderTop: "1px solid rgba(40, 40, 40, 0.06)",
              background: "#FFFFFF",
              display: "flex",
              justifyContent: "flex-end",
              flexShrink: 0,
            }}>
              <button
                type="button"
                onClick={() => setShowActivityModal(false)}
                className="pill-btn pill-btn-solid"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Delete Account Confirmation Modal                                */}
      {/* ========================================================================= */}
      {showDeleteModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteModal(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 10, 10, 0.5)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "clamp(1.5rem, 5vh, 3rem) clamp(1rem, 3vw, 2rem)",
            overflowY: "auto",
          }}
        >
          <div style={{
            width: "100%",
            maxWidth: "480px",
            background: "#FFFFFF",
            padding: "2rem",
            borderRadius: "var(--radius-xl)",
            position: "relative",
            margin: "auto",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.06)",
            animation: "fadeIn 0.2s ease-out",
          }}>
            <button
              onClick={() => setShowDeleteModal(false)}
              className="icon-circle-btn"
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                width: "32px",
                height: "32px",
                zIndex: 10,
              }}
              title="Close modal"
            >
              <X size={14} strokeWidth={1.5} />
            </button>

            <div className="slash-tag" style={{ color: "var(--status-deny)", marginBottom: "0.5rem" }}>
              IRREVERSIBLE ACTION
            </div>

            <h2 style={{ fontSize: "1.35rem", fontWeight: 400, marginBottom: "0.35rem", color: "#DC2626", letterSpacing: "-0.02em" }}>
              Delete User Account
            </h2>
            <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
              Please enter your password to confirm. All your workspaces, data files, MCP credentials, and policy rules will be immediately wiped from disk and database.
            </p>

            {deleteError && (
              <div style={{
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-sm)",
                background: "var(--status-deny-bg)",
                color: "var(--status-deny)",
                fontSize: "0.82rem",
                marginBottom: "1.25rem",
              }}>
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteAccount}>
              <div style={{ marginBottom: "1.75rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 500, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                  Confirm Your Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your current password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="modern-input"
                  autoFocus
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="pill-btn pill-btn-glass"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deletingAccount || !deletePassword}
                  className="pill-btn"
                  style={{
                    background: "#DC2626",
                    color: "#FFFFFF",
                    border: "none",
                    fontWeight: 500,
                  }}
                >
                  {deletingAccount ? "Wiping Account..." : "Permanently Delete Everything"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
