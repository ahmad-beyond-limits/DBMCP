"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { AdminStats, AdminUser, AdminWorkspace, AIGuidancePlaybook, User } from "@/lib/types";
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  FolderGit2,
  FileText,
  Key,
  Activity,
  Search,
  UserCheck,
  UserX,
  KeyRound,
  Trash2,
  LogIn,
  ArrowRight,
  X,
  Lock,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  BookOpen,
  Plus,
  Edit3,
  CheckCircle2,
  Sparkles,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Check,
  ListChecks,
  Zap,
  Pencil,
  Save,
  Eye,
  Code,
  Crown,
} from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [guidanceList, setGuidanceList] = useState<AIGuidancePlaybook[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "workspaces" | "guidance">("users");

  // Playbook Management States
  const [guidanceCategoryFilter, setGuidanceCategoryFilter] = useState<string>("all");
  const [showPlaybookModal, setShowPlaybookModal] = useState(false);
  const [editPlaybook, setEditPlaybook] = useState<AIGuidancePlaybook | null>(null);
  const [playbookTitle, setPlaybookTitle] = useState("");
  const [playbookCategory, setPlaybookCategory] = useState("prompts");
  const [playbookTrigger, setPlaybookTrigger] = useState("");
  const [playbookSummary, setPlaybookSummary] = useState("");
  const [playbookPrompt, setPlaybookPrompt] = useState("");
  const [playbookRules, setPlaybookRules] = useState("");
  const [playbookStyle, setPlaybookStyle] = useState("");
  const [playbookIsActive, setPlaybookIsActive] = useState(true);
  const [playbookTags, setPlaybookTags] = useState("");
  const [previewPlaybook, setPreviewPlaybook] = useState<AIGuidancePlaybook | null>(null);
  const [deletePlaybook, setDeletePlaybook] = useState<AIGuidancePlaybook | null>(null);

  // Platform-Wide General AI Rules State (Static Guardrail Place)
  const [globalRulesText, setGlobalRulesText] = useState("");
  const [globalRulesSaving, setGlobalRulesSaving] = useState(false);
  const [globalRulesSaved, setGlobalRulesSaved] = useState(false);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "admin">("all");

  // Action States
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Reset Password Modal State
  const [resetModalUser, setResetModalUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Delete User Modal State
  const [deleteModalUser, setDeleteModalUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const me = await api.getMe();
      setCurrentUser(me);

      if (!me.is_superuser) {
        router.push("/dashboard");
        return;
      }

      const [statsData, usersData, workspacesData, guidanceData, globalRulesData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminWorkspaces(),
        api.getAdminAIGuidance(),
        api.getAdminGlobalAIRules().catch(() => ({ id: 1, rules_text: "" })),
      ]);

      setStats(statsData);
      setUsers(usersData);
      setWorkspaces(workspacesData);
      setGuidanceList(guidanceData);
      if (globalRulesData && globalRulesData.rules_text !== undefined) {
        setGlobalRulesText(globalRulesData.rules_text || "");
      }
    } catch (err: any) {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGlobalRules = async () => {
    setGlobalRulesSaving(true);
    setGlobalRulesSaved(false);
    try {
      await api.updateAdminGlobalAIRules(globalRulesText);
      setGlobalRulesSaved(true);
      setActionMsg({ type: "success", text: "Global AI Rules saved. All AI interactions will enforce these rules unconditionally." });
      setTimeout(() => setGlobalRulesSaved(false), 3500);
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to save global AI rules" });
    } finally {
      setGlobalRulesSaving(false);
    }
  };

  const handleOpenCreatePlaybook = () => {
    setEditPlaybook(null);
    setPlaybookTitle("");
    setPlaybookCategory("prompts");
    setPlaybookTrigger("");
    setPlaybookSummary("");
    setPlaybookPrompt("");
    setPlaybookRules("");
    setPlaybookStyle("");
    setPlaybookIsActive(true);
    setPlaybookTags("");
    setShowPlaybookModal(true);
  };

  const handleOpenEditPlaybook = (pb: AIGuidancePlaybook) => {
    setEditPlaybook(pb);
    setPlaybookTitle(pb.title);
    setPlaybookCategory(pb.category);
    setPlaybookTrigger(pb.trigger_condition);
    setPlaybookSummary(pb.summary);
    setPlaybookPrompt(pb.prompt_template);
    setPlaybookRules((pb.strict_rules || []).join("\n"));
    setPlaybookStyle(pb.style_guide || "");
    setPlaybookIsActive(pb.is_active);
    setPlaybookTags((pb.tags || []).join(", "));
    setShowPlaybookModal(true);
  };

  const handleSavePlaybook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playbookTitle.trim() || !playbookTrigger.trim() || !playbookSummary.trim() || !playbookPrompt.trim()) {
      setActionMsg({ type: "error", text: "Please fill in Title, Trigger Condition, Summary, and Prompt Template." });
      return;
    }
    setActionLoading(true);
    setActionMsg(null);

    const rulesArray = playbookRules
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    const tagsArray = playbookTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      if (editPlaybook) {
        const updated = await api.updateAdminAIGuidance(editPlaybook.id, {
          title: playbookTitle.trim(),
          category: playbookCategory,
          trigger_condition: playbookTrigger.trim(),
          summary: playbookSummary.trim(),
          prompt_template: playbookPrompt.trim(),
          strict_rules: rulesArray,
          style_guide: playbookStyle.trim(),
          is_active: playbookIsActive,
          tags: tagsArray,
        });
        setGuidanceList((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setActionMsg({ type: "success", text: `Playbook '${updated.title}' updated successfully.` });
      } else {
        const created = await api.createAdminAIGuidance({
          title: playbookTitle.trim(),
          category: playbookCategory,
          trigger_condition: playbookTrigger.trim(),
          summary: playbookSummary.trim(),
          prompt_template: playbookPrompt.trim(),
          strict_rules: rulesArray,
          style_guide: playbookStyle.trim(),
          is_active: playbookIsActive,
          tags: tagsArray,
        });
        setGuidanceList((prev) => [created, ...prev]);
        setActionMsg({ type: "success", text: `Playbook '${created.title}' created successfully.` });
      }
      setShowPlaybookModal(false);
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to save playbook" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePlaybookActive = async (pb: AIGuidancePlaybook) => {
    try {
      const updated = await api.updateAdminAIGuidance(pb.id, { is_active: !pb.is_active });
      setGuidanceList((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setActionMsg({ type: "success", text: `Playbook '${pb.title}' is now ${updated.is_active ? "active" : "deactivated"}.` });
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to toggle playbook status" });
    }
  };

  const handleDeletePlaybook = async () => {
    if (!deletePlaybook) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      await api.deleteAdminAIGuidance(deletePlaybook.id);
      setGuidanceList((prev) => prev.filter((p) => p.id !== deletePlaybook.id));
      setActionMsg({ type: "success", text: `Playbook '${deletePlaybook.title}' deleted successfully.` });
      setDeletePlaybook(null);
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to delete playbook" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user: AdminUser) => {
    setActionLoading(true);
    setActionMsg(null);
    try {
      const res = await api.updateAdminUserStatus(user.id, { is_active: !user.is_active });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: res.is_active } : u))
      );
      setActionMsg({
        type: "success",
        text: `Account for '${user.username}' is now ${res.is_active ? "Active" : "Suspended"}.`,
      });
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to update user status." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSuperuser = async (user: AdminUser) => {
    if (currentUser?.id === user.id && user.is_superuser) {
      setActionMsg({ type: "error", text: "You cannot revoke Superadmin privileges from your own account." });
      return;
    }
    setActionLoading(true);
    setActionMsg(null);
    try {
      const newStatus = !user.is_superuser;
      const res = await api.updateAdminUserStatus(user.id, { is_superuser: newStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_superuser: res.is_superuser } : u))
      );
      setActionMsg({
        type: "success",
        text: res.is_superuser
          ? `User '${user.username}' has been promoted to Superadmin.`
          : `Superadmin privileges removed from '${user.username}'.`,
      });
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to update admin role." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || newPassword.length < 6) return;

    setActionLoading(true);
    setActionMsg(null);
    try {
      await api.adminResetPassword(resetModalUser.id, newPassword);
      setActionMsg({
        type: "success",
        text: `Password for '${resetModalUser.username}' has been reset.`,
      });
      setResetModalUser(null);
      setNewPassword("");
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to reset password." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleImpersonate = async (user: AdminUser) => {
    try {
      await api.adminImpersonateUser(user.id);
      router.push("/dashboard");
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to impersonate user." });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteModalUser) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      await api.adminDeleteUser(deleteModalUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteModalUser.id));
      setActionMsg({
        type: "success",
        text: `Customer '${deleteModalUser.username}' and all workspaces were deleted.`,
      });
      setDeleteModalUser(null);
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to delete user." });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.first_name && u.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.last_name && u.last_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === "active") return u.is_active;
    if (statusFilter === "suspended") return !u.is_active;
    if (statusFilter === "admin") return u.is_superuser;
    return true;
  });

  const filteredWorkspaces = workspaces.filter((ws) => {
    return (
      ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ws.owner_username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ws.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "65vh" }}>
        <div style={{ color: "var(--text-tertiary)", fontSize: "0.95rem" }}>Loading Master Admin Console...</div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: "1180px",
      margin: "0 auto",
      padding: "clamp(2rem, 4vw, 3rem) clamp(1rem, 3vw, 1.5rem) 5rem clamp(1rem, 3vw, 1.5rem)",
    }}>
      {/* Header Banner */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: "2.25rem",
        paddingBottom: "1.5rem",
        borderBottom: "1px solid rgba(40, 40, 40, 0.04)",
        flexWrap: "wrap",
        gap: "1rem",
      }}>
        <div>
          <div className="slash-tag" style={{ color: "#4F46E5", background: "rgba(99, 102, 241, 0.08)" }}>
            SUPERADMIN PRIVILEGES ACTIVE
          </div>
          <h1 className="font-hero" style={{ fontSize: "clamp(1.85rem, 3.5vw, 2.5rem)", letterSpacing: "-0.04em", color: "var(--text-primary)" }}>
            Master Admin Console
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginTop: "0.25rem", fontWeight: 400 }}>
            Supervise all customer accounts, impersonate sessions (Ghost Mode), and oversee platform resources.
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="pill-btn pill-btn-glass"
          style={{ gap: "0.4rem", fontSize: "0.82rem" }}
          title="Refresh Platform Metrics"
        >
          <RefreshCw size={13} strokeWidth={1.5} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Global Status Message */}
      {actionMsg && (
        <div style={{
          padding: "0.85rem 1.25rem",
          borderRadius: "var(--radius-md)",
          background: actionMsg.type === "success" ? "var(--status-allow-bg)" : "var(--status-deny-bg)",
          color: actionMsg.type === "success" ? "var(--status-allow)" : "var(--status-deny)",
          fontSize: "0.86rem",
          marginBottom: "1.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Key Metrics Cards */}
      {stats && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          marginBottom: "2.5rem",
        }}>
          <div className="frosted-panel" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-tertiary)", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total Users</span>
              <Users size={16} strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 400, color: "var(--text-primary)" }}>
              {stats.total_users}
            </div>
            <div style={{ fontSize: "0.76rem", color: "var(--status-allow)", marginTop: "0.2rem" }}>
              {stats.active_users} Active Customers
            </div>
          </div>

          <div className="frosted-panel" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-tertiary)", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Workspaces</span>
              <FolderGit2 size={16} strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 400, color: "var(--text-primary)" }}>
              {stats.total_workspaces}
            </div>
            <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              Across all tenants
            </div>
          </div>

          <div className="frosted-panel" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-tertiary)", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Documents</span>
              <FileText size={16} strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 400, color: "var(--text-primary)" }}>
              {stats.total_files}
            </div>
            <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              Managed & Indexed
            </div>
          </div>

          <div className="frosted-panel" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-tertiary)", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>MCP API Links</span>
              <Key size={16} strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 400, color: "var(--text-primary)" }}>
              {stats.total_credentials}
            </div>
            <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              Signed API tokens
            </div>
          </div>

          <div className="frosted-panel" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-tertiary)", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Audit Events</span>
              <Activity size={16} strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 400, color: "var(--text-primary)" }}>
              {stats.total_audit_logs}
            </div>
            <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              Security trace events
            </div>
          </div>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1.5rem",
        flexWrap: "wrap",
        gap: "1rem",
      }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => setActiveTab("users")}
            className={`pill-tab ${activeTab === "users" ? "active" : ""}`}
            style={{ fontSize: "0.85rem", padding: "0.45rem 1rem" }}
          >
            Customer Directory ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("workspaces")}
            className={`pill-tab ${activeTab === "workspaces" ? "active" : ""}`}
            style={{ fontSize: "0.85rem", padding: "0.45rem 1rem" }}
          >
            All Workspaces ({workspaces.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("guidance");
              setSearchQuery("");
            }}
            className={`pill-tab ${activeTab === "guidance" ? "active" : ""}`}
            style={{ fontSize: "0.85rem", padding: "0.45rem 1rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <BookOpen size={14} strokeWidth={1.75} />
            <span>AI Playbooks & Guidance ({guidanceList.length})</span>
          </button>
        </div>

        {/* Search & Filter & Create Action */}
        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center", width: "100%", maxWidth: activeTab === "guidance" ? "650px" : "450px" }}>
          {activeTab === "users" && (
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="modern-input"
              style={{ width: "140px", padding: "0.45rem 0.75rem", fontSize: "0.82rem" }}
            >
              <option value="all">All Users</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended</option>
              <option value="admin">Superadmins</option>
            </select>
          )}

          {activeTab === "guidance" && (
            <>
              <select
                value={guidanceCategoryFilter}
                onChange={(e: any) => setGuidanceCategoryFilter(e.target.value)}
                className="modern-input"
                style={{ width: "140px", padding: "0.45rem 0.75rem", fontSize: "0.82rem" }}
              >
                <option value="all">All Categories</option>
                <option value="prompts">Prompts</option>
                <option value="analysis">Analysis</option>
                <option value="advisory">Advisory</option>
                <option value="compliance">Compliance</option>
                <option value="general">General</option>
              </select>

              <button
                type="button"
                onClick={handleOpenCreatePlaybook}
                className="pill-btn pill-btn-solid"
                style={{ padding: "0.42rem 0.95rem", fontSize: "0.8rem", gap: "0.4rem", whiteSpace: "nowrap" }}
              >
                <Plus size={14} strokeWidth={2} />
                <span>Create Playbook</span>
              </button>
            </>
          )}

          <div className="modern-search-bar" style={{ flex: 1, minWidth: "180px" }}>
            <Search size={14} color="var(--text-tertiary)" strokeWidth={1.5} />
            <input
              type="text"
              placeholder={
                activeTab === "users"
                  ? "Search users by name, username..."
                  : activeTab === "workspaces"
                  ? "Search workspaces..."
                  : "Search playbooks, trigger conditions..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tab Content: Users Directory */}
      {activeTab === "users" && (
        <div className="frosted-panel" style={{ padding: "0", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "rgba(0, 0, 0, 0.02)", borderBottom: "1px solid rgba(40, 40, 40, 0.06)" }}>
                  <th style={{ padding: "0.95rem 1.25rem", fontWeight: 500, color: "var(--text-secondary)" }}>User / Customer</th>
                  <th style={{ padding: "0.95rem 1rem", fontWeight: 500, color: "var(--text-secondary)" }}>Role & Status</th>
                  <th style={{ padding: "0.95rem 1rem", fontWeight: 500, color: "var(--text-secondary)" }}>Workspaces & Files</th>
                  <th style={{ padding: "0.95rem 1rem", fontWeight: 500, color: "var(--text-secondary)" }}>Joined Date</th>
                  <th style={{ padding: "0.95rem 1.25rem", fontWeight: 500, color: "var(--text-secondary)", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--text-tertiary)" }}>
                      No customers found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    return (
                      <tr
                        key={u.id}
                        style={{
                          borderBottom: "1px solid rgba(40, 40, 40, 0.04)",
                          background: isSelf ? "rgba(99, 102, 241, 0.02)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "1rem 1.25rem" }}>
                          <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                            {u.first_name || u.last_name
                              ? `${u.first_name || ""} ${u.last_name || ""}`.trim()
                              : u.username}
                            {isSelf && (
                              <span style={{
                                marginLeft: "0.5rem",
                                fontSize: "0.7rem",
                                background: "rgba(99, 102, 241, 0.1)",
                                color: "#4F46E5",
                                padding: "0.15rem 0.45rem",
                                borderRadius: "var(--radius-pill)",
                              }}>
                                You
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontFamily: "JetBrains Mono, monospace" }}>
                            @{u.username} • ID: {u.id.slice(0, 8)}...
                          </div>
                        </td>

                        <td style={{ padding: "1rem" }}>
                          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
                            {/* Role Badge with Click-to-Toggle if not self */}
                            <button
                              type="button"
                              onClick={() => !isSelf && handleToggleSuperuser(u)}
                              disabled={isSelf}
                              style={{
                                border: "none",
                                cursor: isSelf ? "default" : "pointer",
                                padding: 0,
                                background: "transparent",
                              }}
                              title={isSelf ? "Your current role" : u.is_superuser ? "Click to demote from Superadmin" : "Click to make this user Superadmin"}
                            >
                              <span style={{
                                fontSize: "0.72rem",
                                fontWeight: 550,
                                padding: "0.22rem 0.6rem",
                                borderRadius: "var(--radius-pill)",
                                background: u.is_superuser ? "rgba(99, 102, 241, 0.12)" : "rgba(0, 0, 0, 0.04)",
                                color: u.is_superuser ? "#4F46E5" : "var(--text-secondary)",
                                border: u.is_superuser ? "1px solid rgba(99, 102, 241, 0.25)" : "1px solid rgba(0,0,0,0.06)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem",
                              }}>
                                <Crown size={11} strokeWidth={u.is_superuser ? 2.2 : 1.5} />
                                <span>{u.is_superuser ? "Superadmin" : "Customer"}</span>
                              </span>
                            </button>

                            <span style={{
                              fontSize: "0.72rem",
                              fontWeight: 500,
                              padding: "0.2rem 0.55rem",
                              borderRadius: "var(--radius-pill)",
                              background: u.is_active ? "var(--status-allow-bg)" : "var(--status-deny-bg)",
                              color: u.is_active ? "var(--status-allow)" : "var(--status-deny)",
                            }}>
                              {u.is_active ? "Active" : "Suspended"}
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>
                          <div style={{ fontSize: "0.82rem" }}>
                            <strong>{u.workspaces_count}</strong> workspaces • <strong>{u.files_count}</strong> files
                          </div>
                        </td>

                        <td style={{ padding: "1rem", color: "var(--text-tertiary)", fontSize: "0.8rem" }}>
                          {new Date(u.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        </td>

                        <td style={{ padding: "1rem 1.25rem", textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.4rem" }}>
                            {/* Impersonate (Ghost Mode) */}
                            {!isSelf && (
                              <button
                                onClick={() => handleImpersonate(u)}
                                className="pill-btn-sm"
                                style={{
                                  background: "rgba(99, 102, 241, 0.08)",
                                  border: "1px solid rgba(99, 102, 241, 0.25)",
                                  color: "#4F46E5",
                                  fontSize: "0.76rem",
                                  gap: "0.3rem",
                                }}
                                title="Log in as this customer (Ghost Mode)"
                              >
                                <LogIn size={12} strokeWidth={1.5} />
                                <span>Impersonate</span>
                              </button>
                            )}

                            {/* Reset Password */}
                            <button
                              onClick={() => {
                                setResetModalUser(u);
                                setNewPassword("");
                              }}
                              className="icon-circle-btn"
                              style={{ width: "30px", height: "30px" }}
                              title="Reset Password"
                            >
                              <KeyRound size={13} strokeWidth={1.5} />
                            </button>

                            {/* Toggle Superadmin Role */}
                            {!isSelf && (
                              <button
                                onClick={() => handleToggleSuperuser(u)}
                                className="icon-circle-btn"
                                style={{
                                  width: "30px",
                                  height: "30px",
                                  color: u.is_superuser ? "#4F46E5" : "var(--text-tertiary)",
                                  background: u.is_superuser ? "rgba(99, 102, 241, 0.1)" : "transparent",
                                  border: u.is_superuser ? "1px solid rgba(99, 102, 241, 0.25)" : "1px solid rgba(40, 40, 40, 0.08)",
                                }}
                                title={u.is_superuser ? "Revoke Superadmin Privileges" : "Grant Superadmin Privileges (Make Admin)"}
                              >
                                <Crown size={13} strokeWidth={u.is_superuser ? 2 : 1.5} />
                              </button>
                            )}

                            {/* Suspend / Activate Toggle */}
                            {!isSelf && (
                              <button
                                onClick={() => handleToggleStatus(u)}
                                className="icon-circle-btn"
                                style={{
                                  width: "30px",
                                  height: "30px",
                                  color: u.is_active ? "#EF4444" : "#16A34A",
                                }}
                                title={u.is_active ? "Suspend Account" : "Activate Account"}
                              >
                                {u.is_active ? <UserX size={13} strokeWidth={1.5} /> : <UserCheck size={13} strokeWidth={1.5} />}
                              </button>
                            )}

                            {/* Delete User */}
                            {!isSelf && (
                              <button
                                onClick={() => setDeleteModalUser(u)}
                                className="icon-circle-btn"
                                style={{ width: "30px", height: "30px", color: "#EF4444" }}
                                title="Permanently Delete Account"
                              >
                                <Trash2 size={13} strokeWidth={1.5} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: All Platform Workspaces */}
      {activeTab === "workspaces" && (
        <div className="frosted-panel" style={{ padding: "0", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "rgba(0, 0, 0, 0.02)", borderBottom: "1px solid rgba(40, 40, 40, 0.06)" }}>
                  <th style={{ padding: "0.95rem 1.25rem", fontWeight: 500, color: "var(--text-secondary)" }}>Workspace Name</th>
                  <th style={{ padding: "0.95rem 1rem", fontWeight: 500, color: "var(--text-secondary)" }}>Owner</th>
                  <th style={{ padding: "0.95rem 1rem", fontWeight: 500, color: "var(--text-secondary)" }}>Files & MCP Links</th>
                  <th style={{ padding: "0.95rem 1rem", fontWeight: 500, color: "var(--text-secondary)" }}>Created Date</th>
                  <th style={{ padding: "0.95rem 1.25rem", fontWeight: 500, color: "var(--text-secondary)", textAlign: "right" }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkspaces.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--text-tertiary)" }}>
                      No workspaces found.
                    </td>
                  </tr>
                ) : (
                  filteredWorkspaces.map((ws) => (
                    <tr key={ws.id} style={{ borderBottom: "1px solid rgba(40, 40, 40, 0.04)" }}>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{ws.name}</div>
                        {ws.description && (
                          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{ws.description}</div>
                        )}
                        <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", fontFamily: "JetBrains Mono, monospace" }}>
                          ID: {ws.id}
                        </div>
                      </td>
                      <td style={{ padding: "1rem", color: "var(--text-primary)" }}>
                        @{ws.owner_username}
                      </td>
                      <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>
                        {ws.files_count} files • {ws.credentials_count} MCP keys
                      </td>
                      <td style={{ padding: "1rem", color: "var(--text-tertiary)", fontSize: "0.8rem" }}>
                        {new Date(ws.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                      </td>
                      <td style={{ padding: "1rem 1.25rem", textAlign: "right" }}>
                        <Link
                          href={`/workspaces/${ws.id}`}
                          className="pill-btn pill-btn-glass"
                          style={{ fontSize: "0.78rem", padding: "0.3rem 0.65rem", display: "inline-flex", gap: "0.3rem" }}
                        >
                          <span>Open</span>
                          <ExternalLink size={12} strokeWidth={1.5} />
                        </Link>
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
      {/* Tab Content: AI Playbooks & Guidance Layer                                */}
      {/* ========================================================================= */}
      {activeTab === "guidance" && (() => {
        const filteredPlaybooks = guidanceList.filter((pb) => {
          if (guidanceCategoryFilter !== "all" && pb.category !== guidanceCategoryFilter) {
            return false;
          }
          if (!searchQuery.trim()) return true;
          const q = searchQuery.toLowerCase();
          const tagStr = (pb.tags || []).join(" ").toLowerCase();
          return (
            pb.title.toLowerCase().includes(q) ||
            pb.trigger_condition.toLowerCase().includes(q) ||
            pb.summary.toLowerCase().includes(q) ||
            tagStr.includes(q)
          );
        });

        const totalRulesCount = guidanceList.reduce((acc, pb) => acc + (pb.strict_rules?.length || 0), 0);
        const activePlaybooksCount = guidanceList.filter((pb) => pb.is_active).length;

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Guidance Layer Overview Banner: Soft Clinical Minimalism */}
            <div
              className="frosted-panel"
              style={{
                padding: "clamp(1.5rem, 3vw, 2rem)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                flexWrap: "wrap",
                gap: "1.25rem",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ maxWidth: "780px" }}>
                <div className="slash-tag">POAIS AI POLICY &amp; PLAYBOOK GOVERNANCE</div>
                <h2 className="font-hero" style={{ fontSize: "clamp(1.4rem, 2.5vw, 1.85rem)", letterSpacing: "-0.04em", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                  Progressive Guidance &amp; Strict Rule Engine
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.55, fontWeight: 400, margin: "0 0 1rem 0" }}>
                  Routine data queries (files, datasets, schema lookups) bypass this layer completely. When the user requests <strong>advice, strategic analysis, or decisions</strong>, the AI scans lightweight titles first to maintain minimal cognitive load, then strictly enforces your non-negotiable rules.
                </p>

                {/* Subtle Metric Pills Row */}
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
                  <span className="badge-status" style={{ background: "rgba(255, 255, 255, 0.85)", borderColor: "rgba(40, 40, 40, 0.08)", color: "var(--text-primary)" }}>
                    <BookOpen size={13} strokeWidth={1.5} />
                    <span>{activePlaybooksCount} Active Playbooks</span>
                  </span>
                  <span className="badge-status" style={{ background: "rgba(255, 255, 255, 0.85)", borderColor: "rgba(40, 40, 40, 0.08)", color: "var(--text-primary)" }}>
                    <ShieldCheck size={13} strokeWidth={1.5} />
                    <span>{totalRulesCount} Strict Guardrails Enforced</span>
                  </span>
                  <span className="badge-status" style={{ background: "rgba(255, 255, 255, 0.85)", borderColor: "rgba(40, 40, 40, 0.08)", color: "var(--text-secondary)" }}>
                    <Zap size={13} strokeWidth={1.5} />
                    <span>Zero Token Overhead on Data Queries</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenCreatePlaybook}
                className="pill-btn pill-btn-solid"
                style={{ padding: "0.65rem 1.45rem", fontSize: "0.85rem", gap: "0.45rem" }}
              >
                <Plus size={15} strokeWidth={1.75} />
                <span>New Guidance Playbook</span>
              </button>
            </div>

            {/* STATIC PLACE: General Rules for AI (Platform-Wide Non-Negotiable Guardrails) */}
            <div
              className="frosted-panel"
              style={{
                padding: "clamp(1.5rem, 3vw, 1.85rem)",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
                border: "1px solid rgba(194, 65, 12, 0.16)",
                background: "linear-gradient(180deg, #FFFFFF 0%, #FAFAFB 100%)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        padding: "0.2rem 0.65rem",
                        borderRadius: "var(--radius-pill)",
                        background: "rgba(194, 65, 12, 0.08)",
                        border: "1px solid rgba(194, 65, 12, 0.15)",
                        color: "#C2410C",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      <ShieldAlert size={12} strokeWidth={2} />
                      <span>General Rules for AI (Static Platform Guardrails)</span>
                    </div>
                    <span style={{ fontSize: "0.74rem", color: "var(--text-tertiary)" }}>
                      Enforced unconditionally across ALL workspaces
                    </span>
                  </div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 500, color: "var(--text-primary)", letterSpacing: "-0.02em", margin: 0 }}>
                    Global AI Behavior &amp; Strict Operational Rules
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={handleSaveGlobalRules}
                  disabled={globalRulesSaving}
                  className="pill-btn pill-btn-solid"
                  style={{
                    padding: "0.5rem 1.15rem",
                    fontSize: "0.82rem",
                    gap: "0.45rem",
                    background: globalRulesSaved ? "#16A34A" : "var(--btn-solid-bg)",
                    color: "var(--btn-solid-text)",
                    transition: "background 200ms ease",
                  }}
                >
                  {globalRulesSaved ? (
                    <>
                      <CheckCircle2 size={14} strokeWidth={2} />
                      <span>Saved Guardrails!</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} strokeWidth={1.75} />
                      <span>{globalRulesSaving ? "Saving..." : "Save General Rules"}</span>
                    </>
                  )}
                </button>
              </div>

              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>
                Define universal rules the AI must ALWAYS obey during every conversation and analysis, regardless of specific playbooks. The AI retrieves these directly via the <code>get_global_ai_rules</code> MCP tool. Enter <strong>one rule per line</strong>.
              </p>

              <div>
                <textarea
                  rows={5}
                  placeholder={`1. Never share, cross-reference, or leak data between different workspaces.\n2. Always verify calculations against underlying table rows and state exact source references.\n3. Never assume or extrapolate missing values without explicitly flagging the uncertainty.\n4. Always respond in clear, professional Markdown formatting with structured headings.`}
                  value={globalRulesText}
                  onChange={(e) => setGlobalRulesText(e.target.value)}
                  className="modern-input"
                  style={{
                    width: "100%",
                    fontFamily: "var(--font-mono, monospace), monospace",
                    fontSize: "0.82rem",
                    lineHeight: 1.6,
                    padding: "0.85rem 1rem",
                    borderRadius: "var(--radius-md)",
                    resize: "vertical",
                    background: "#FDFCFC",
                    border: "1px solid rgba(40, 40, 40, 0.1)",
                  }}
                />
              </div>

              {/* Active Rules Counter & Preview */}
              {(() => {
                const parsedRules = globalRulesText
                  .split("\n")
                  .map((r) => r.trim())
                  .filter((r) => r.length > 0);

                if (parsedRules.length === 0) {
                  return (
                    <div style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", fontStyle: "italic" }}>
                      No general rules defined yet. Add rules above to activate platform-wide guardrails.
                    </div>
                  );
                }

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Active Guardrails Preview ({parsedRules.length} {parsedRules.length === 1 ? "rule" : "rules"})
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "#16A34A", fontWeight: 500 }}>
                        ✓ Loaded for AI MCP calls
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "0.5rem" }}>
                      {parsedRules.map((rule, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "0.55rem",
                            padding: "0.55rem 0.85rem",
                            borderRadius: "var(--radius-sm)",
                            background: "rgba(255, 255, 255, 0.9)",
                            border: "1px solid rgba(194, 65, 12, 0.1)",
                            fontSize: "0.78rem",
                            color: "var(--text-primary)",
                            lineHeight: 1.45,
                          }}
                        >
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#C2410C", marginTop: "5px", flexShrink: 0 }} />
                          <span style={{ flex: 1 }}>{rule}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Playbooks Grid */}
            {filteredPlaybooks.length === 0 ? (
              <div
                className="frosted-panel"
                style={{
                  textAlign: "center",
                  padding: "4.5rem 1.5rem",
                  color: "var(--text-tertiary)",
                }}
              >
                <BookOpen size={42} strokeWidth={1.25} style={{ margin: "0 auto 0.85rem auto", opacity: 0.4 }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 400, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: "0.35rem" }}>
                  {searchQuery ? `No playbooks matching "${searchQuery}"` : "No AI Guidance Playbooks found"}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", maxWidth: "440px", margin: "0 auto 1.5rem auto", lineHeight: 1.5 }}>
                  Define prompts, advisory instructions, and strict non-negotiable rules for the AI to enforce during critical user interactions.
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreatePlaybook}
                  className="pill-btn pill-btn-solid pill-btn-sm"
                  style={{ gap: "0.4rem" }}
                >
                  <Plus size={13} strokeWidth={1.75} />
                  <span>Create First Playbook</span>
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.25rem" }}>
                {filteredPlaybooks.map((pb) => (
                  <div
                    key={pb.id}
                    className="frosted-panel"
                    style={{
                      padding: "clamp(1.5rem, 3vw, 1.75rem)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "1.25rem",
                      position: "relative",
                      opacity: pb.is_active ? 1 : 0.65,
                      transition: "transform 250ms ease, background-color 250ms ease, box-shadow 250ms ease, opacity 200ms ease",
                    }}
                  >
                    <div>
                      {/* Category & Tactile Status Bar */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <span
                          className="badge-status"
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 500,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            padding: "0.25rem 0.75rem",
                            background:
                              pb.category === "compliance"
                                ? "rgba(194, 65, 12, 0.06)"
                                : "#ECECED",
                            color:
                              pb.category === "compliance"
                                ? "#c2410c"
                                : "var(--text-primary)",
                            borderColor:
                              pb.category === "compliance"
                                ? "rgba(194, 65, 12, 0.12)"
                                : "rgba(40, 40, 40, 0.08)",
                          }}
                        >
                          {pb.category}
                        </span>

                        {/* Tactile Active / Inactive Switch Pill */}
                        <button
                          type="button"
                          onClick={() => handleTogglePlaybookActive(pb)}
                          className="pill-tab"
                          style={{
                            padding: "0.25rem 0.75rem",
                            fontSize: "0.74rem",
                            height: "auto",
                            gap: "0.45rem",
                            cursor: "pointer",
                          }}
                          title={pb.is_active ? "Click to deactivate playbook" : "Click to activate playbook"}
                        >
                          <span
                            style={{
                              width: "7px",
                              height: "7px",
                              borderRadius: "50%",
                              background: pb.is_active ? "#16A34A" : "#989B9D",
                              boxShadow: pb.is_active ? "0 0 0 2px rgba(22, 163, 74, 0.2)" : "none",
                              display: "inline-block",
                            }}
                          />
                          <span style={{ color: pb.is_active ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                            {pb.is_active ? "Active" : "Disabled"}
                          </span>
                        </button>
                      </div>

                      {/* Playbook Title */}
                      <h3
                        style={{
                          fontSize: "1.2rem",
                          fontWeight: 400,
                          color: "var(--text-primary)",
                          letterSpacing: "-0.03em",
                          lineHeight: 1.28,
                          marginBottom: "0.85rem",
                        }}
                      >
                        {pb.title}
                      </h3>

                      {/* AI Trigger Condition: Soft Clinical Recessed Panel */}
                      <div
                        style={{
                          background: "#ECECED",
                          padding: "0.95rem 1.15rem",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid rgba(40, 40, 40, 0.06)",
                          marginBottom: "1rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.35rem" }}>
                          <Zap size={12} strokeWidth={2} color="var(--text-secondary)" />
                          <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            AI Scan Trigger
                          </span>
                        </div>
                        <p style={{ fontSize: "0.82rem", color: "var(--text-primary)", lineHeight: 1.5, margin: 0, fontWeight: 400 }}>
                          {pb.trigger_condition}
                        </p>
                      </div>

                      {/* Summary */}
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 1rem 0" }}>
                        {pb.summary}
                      </p>

                      {/* Strict Rules: Soft Clinical Security Badging */}
                      {pb.strict_rules && pb.strict_rules.length > 0 && (
                        <div style={{ marginBottom: "1rem" }}>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.45rem",
                              padding: "0.25rem 0.75rem",
                              borderRadius: "var(--radius-pill)",
                              background: "rgba(194, 65, 12, 0.06)",
                              border: "1px solid rgba(194, 65, 12, 0.12)",
                              color: "#c2410c",
                              fontSize: "0.72rem",
                              fontWeight: 550,
                              marginBottom: "0.55rem",
                            }}
                          >
                            <ShieldAlert size={12} strokeWidth={2} />
                            <span>{pb.strict_rules.length} Non-Negotiable Guardrails</span>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                            {pb.strict_rules.slice(0, 2).map((rule, rIdx) => (
                              <div
                                key={rIdx}
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: "0.5rem",
                                  padding: "0.5rem 0.8rem",
                                  borderRadius: "var(--radius-sm)",
                                  background: "rgba(255, 255, 255, 0.75)",
                                  border: "1px solid rgba(40, 40, 40, 0.04)",
                                  fontSize: "0.77rem",
                                  color: "var(--text-primary)",
                                  lineHeight: 1.45,
                                }}
                              >
                                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#c2410c", marginTop: "6px", flexShrink: 0 }} />
                                <span>{rule}</span>
                              </div>
                            ))}

                            {pb.strict_rules.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setPreviewPlaybook(pb)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  padding: "0.2rem 0.2rem",
                                  color: "var(--text-tertiary)",
                                  fontSize: "0.74rem",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                  textAlign: "left",
                                }}
                              >
                                <span>+ {pb.strict_rules.length - 2} more rules (click AI Preview to inspect)</span>
                                <ArrowRight size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {pb.tags && pb.tags.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                          {pb.tags.map((tag) => (
                            <span
                              key={tag}
                              style={{
                                fontSize: "0.7rem",
                                padding: "0.2rem 0.65rem",
                                borderRadius: "var(--radius-pill)",
                                background: "#ECECED",
                                border: "1px solid rgba(40, 40, 40, 0.06)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingTop: "0.95rem",
                        borderTop: "1px solid rgba(40, 40, 40, 0.05)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setPreviewPlaybook(pb)}
                        className="pill-btn pill-btn-glass pill-btn-sm"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                        title="Inspect how the AI model receives this playbook"
                      >
                        <Eye size={13} strokeWidth={1.5} />
                        <span>Inspect AI View</span>
                      </button>

                      <div style={{ display: "flex", gap: "0.45rem", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditPlaybook(pb)}
                          className="icon-circle-btn"
                          style={{ width: "32px", height: "32px" }}
                          title="Edit Playbook"
                        >
                          <Pencil size={13} strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletePlaybook(pb)}
                          className="icon-circle-btn"
                          style={{ width: "32px", height: "32px", color: "#c2410c" }}
                          title="Delete Playbook"
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}


      {/* Modal: Admin Force Reset Password */}
      {resetModalUser && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setResetModalUser(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 10, 10, 0.45)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "1rem",
            overflowY: "auto",
          }}
        >
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: "440px",
            background: "#FFFFFF",
            padding: "2rem",
            borderRadius: "var(--radius-xl)",
            position: "relative",
            boxShadow: "var(--shadow-xl)",
          }}>
            <button
              onClick={() => setResetModalUser(null)}
              className="icon-circle-btn"
              style={{ position: "absolute", top: "1.25rem", right: "1.25rem", width: "32px", height: "32px", zIndex: 10 }}
            >
              <X size={14} />
            </button>

            <div className="slash-tag">ADMIN ACTION</div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 400, marginBottom: "0.35rem", color: "var(--text-primary)" }}>
              Reset Customer Password
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Set a new password for <strong>@{resetModalUser.username}</strong>.
            </p>

            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
                  New Password (Min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="modern-input"
                  autoFocus
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="pill-btn pill-btn-glass"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || newPassword.length < 6}
                  className="pill-btn pill-btn-solid"
                >
                  {actionLoading ? "Updating..." : "Save New Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Admin Delete User Account */}
      {deleteModalUser && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteModalUser(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 10, 10, 0.45)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "1rem",
            overflowY: "auto",
          }}
        >
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: "460px",
            background: "#FFFFFF",
            padding: "2rem",
            borderRadius: "var(--radius-xl)",
            position: "relative",
            boxShadow: "var(--shadow-xl)",
          }}>
            <button
              onClick={() => setDeleteModalUser(null)}
              className="icon-circle-btn"
              style={{ position: "absolute", top: "1.25rem", right: "1.25rem", width: "32px", height: "32px" }}
            >
              <X size={14} />
            </button>

            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#DC2626",
              padding: "0.25rem 0.65rem",
              borderRadius: "var(--radius-pill)",
              fontSize: "0.72rem",
              fontWeight: 600,
              marginBottom: "0.75rem",
            }}>
              <AlertTriangle size={13} />
              <span>Permanent Deletion</span>
            </div>

            <h2 style={{ fontSize: "1.35rem", fontWeight: 400, marginBottom: "0.35rem", color: "#DC2626" }}>
              Delete Customer Account
            </h2>
            <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
              Are you sure you want to permanently delete <strong>@{deleteModalUser.username}</strong>? All their <strong>{deleteModalUser.workspaces_count} workspaces</strong>, <strong>{deleteModalUser.files_count} files</strong>, and MCP credentials will be permanently erased.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="pill-btn pill-btn-glass"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteUser}
                className="pill-btn"
                style={{ background: "#DC2626", color: "#FFFFFF", border: "none" }}
              >
                {actionLoading ? "Deleting..." : "Permanently Delete Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modal: Create / Edit AI Guidance Playbook                                */}
      {/* ========================================================================= */}
      {showPlaybookModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPlaybookModal(false);
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
            padding: "clamp(0.5rem, 2vw, 1.5rem)",
            overflowY: "auto",
          }}
        >
          <div
            className="frosted-panel"
            style={{
              width: "100%",
              maxWidth: "760px",
              maxHeight: "90vh",
              background: "#FFFFFF",
              borderRadius: "var(--radius-xl)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1.25rem 1.75rem",
                borderBottom: "1px solid rgba(40, 40, 40, 0.06)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div className="slash-tag" style={{ color: "#4F46E5", background: "rgba(99, 102, 241, 0.08)" }}>
                  AI PLAYBOOK GOVERNANCE
                </div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>
                  {editPlaybook ? "Edit AI Guidance Playbook" : "Create New AI Guidance Playbook"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPlaybookModal(false)}
                className="icon-circle-btn"
                style={{ width: "32px", height: "32px" }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSavePlaybook} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div style={{ padding: "1.5rem 1.75rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.15rem", flex: 1 }}>
                {/* Title and Category */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 550, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                      Playbook Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Financial Advisory &amp; Forecasting Rules"
                      value={playbookTitle}
                      onChange={(e) => setPlaybookTitle(e.target.value)}
                      className="modern-input"
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 550, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                      Category *
                    </label>
                    <select
                      value={playbookCategory}
                      onChange={(e) => setPlaybookCategory(e.target.value)}
                      className="modern-input"
                    >
                      <option value="prompts">Prompts</option>
                      <option value="analysis">Analysis</option>
                      <option value="advisory">Advisory</option>
                      <option value="compliance">Compliance</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                </div>

                {/* Trigger Condition */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.35rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 550, color: "var(--text-primary)" }}>
                      AI Scan Trigger Condition *
                    </label>
                    <span style={{ fontSize: "0.7rem", color: "#4F46E5", fontWeight: 500 }}>
                      Evaluated during title scan (low cognitive load)
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Activate when the user asks for financial forecasting, ROI calculations, or investment advice."
                    value={playbookTrigger}
                    onChange={(e) => setPlaybookTrigger(e.target.value)}
                    className="modern-input"
                  />
                </div>

                {/* Summary */}
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 550, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                    Summary / Purpose *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Brief 1-sentence description of what this playbook accomplishes"
                    value={playbookSummary}
                    onChange={(e) => setPlaybookSummary(e.target.value)}
                    className="modern-input"
                  />
                </div>

                {/* Prompt Template */}
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 550, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                    Prompt Template &amp; Role Instructions *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Define the role, analytical methodology, and reasoning steps the AI must adopt..."
                    value={playbookPrompt}
                    onChange={(e) => setPlaybookPrompt(e.target.value)}
                    className="modern-input"
                    style={{ fontFamily: "inherit", lineHeight: 1.5, resize: "vertical" }}
                  />
                </div>

                {/* Strict Rules (One per line) */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.35rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 550, color: "#DC2626", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <ShieldAlert size={13} />
                      <span>Strict Non-Negotiable Rules (One per line)</span>
                    </label>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>
                      Zero-tolerance guardrails for the AI
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    placeholder={"Never provide unconditional guarantees on future market outcomes.\nAlways cite exact row numbers for metric calculations.\nInclude a mandatory Risk Disclosure section."}
                    value={playbookRules}
                    onChange={(e) => setPlaybookRules(e.target.value)}
                    className="modern-input"
                    style={{ fontFamily: "inherit", lineHeight: 1.5, resize: "vertical" }}
                  />
                </div>

                {/* Style Guide */}
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 550, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                    Style &amp; Formatting Guide (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Structure response with: 1. Executive Summary, 2. Deep Dive, 3. Next Steps."
                    value={playbookStyle}
                    onChange={(e) => setPlaybookStyle(e.target.value)}
                    className="modern-input"
                  />
                </div>

                {/* Tags and Active State */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "center" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 550, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="finance, strict, advisory, metrics"
                      value={playbookTags}
                      onChange={(e) => setPlaybookTags(e.target.value)}
                      className="modern-input"
                    />
                  </div>

                  <div style={{ paddingTop: "1.25rem" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.82rem", color: "var(--text-primary)" }}>
                      <input
                        type="checkbox"
                        checked={playbookIsActive}
                        onChange={(e) => setPlaybookIsActive(e.target.checked)}
                      />
                      <span>Active for AI Model</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: "1rem 1.75rem",
                  borderTop: "1px solid rgba(40, 40, 40, 0.06)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  background: "#FAFAFA",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowPlaybookModal(false)}
                  className="pill-btn pill-btn-glass"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="pill-btn pill-btn-solid"
                  style={{ gap: "0.4rem" }}
                >
                  <span>{editPlaybook ? "Save Changes" : "Create Playbook"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modal: AI Inspection / Progressive Disclosure Preview                    */}
      {/* ========================================================================= */}
      {previewPlaybook && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewPlaybook(null);
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
            padding: "clamp(0.5rem, 2vw, 1.5rem)",
            overflowY: "auto",
          }}
        >
          <div
            className="frosted-panel"
            style={{
              width: "100%",
              maxWidth: "800px",
              maxHeight: "90vh",
              background: "#FFFFFF",
              borderRadius: "var(--radius-xl)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "1.25rem 1.75rem",
                borderBottom: "1px solid rgba(40, 40, 40, 0.06)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div className="slash-tag" style={{ color: "#0284C7", background: "rgba(14, 165, 233, 0.08)" }}>
                  COGNITIVE LOAD AUDIT
                </div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>
                  AI Model View Simulation: {previewPlaybook.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPlaybook(null)}
                className="icon-circle-btn"
                style={{ width: "32px", height: "32px" }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Preview Body */}
            <div style={{ padding: "1.5rem 1.75rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Step 1: Lightweight Search */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.45rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px", background: "rgba(16, 185, 129, 0.1)", color: "#059669" }}>
                    STEP 1: LIGHTWEIGHT SEARCH
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                    Via <code>search_ai_guidance</code> (Minimal ~35 tokens)
                  </span>
                </div>
                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    padding: "0.85rem 1rem",
                    fontSize: "0.78rem",
                    fontFamily: "JetBrains Mono, monospace",
                    color: "#0F172A",
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
{JSON.stringify({
  guidance_id: previewPlaybook.id,
  title: previewPlaybook.title,
  category: previewPlaybook.category,
  trigger_condition: previewPlaybook.trigger_condition,
  summary: previewPlaybook.summary,
  tags: previewPlaybook.tags,
}, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Step 2: Loaded Full Playbook */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.45rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px", background: "rgba(99, 102, 241, 0.1)", color: "#4F46E5" }}>
                    STEP 2: FULL PLAYBOOK ACTIVATION
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                    Via <code>get_ai_guidance</code> (Loaded only if trigger matches)
                  </span>
                </div>
                <div
                  style={{
                    background: "#0F172A",
                    border: "1px solid #1E293B",
                    borderRadius: "8px",
                    padding: "1rem 1.15rem",
                    fontSize: "0.78rem",
                    fontFamily: "JetBrains Mono, monospace",
                    color: "#38BDF8",
                    lineHeight: 1.6,
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#F8FAFC" }}>
{JSON.stringify({
  guidance_id: previewPlaybook.id,
  title: previewPlaybook.title,
  category: previewPlaybook.category,
  trigger_condition: previewPlaybook.trigger_condition,
  prompt_instructions: previewPlaybook.prompt_template,
  strict_rules: previewPlaybook.strict_rules,
  style_guide: previewPlaybook.style_guide,
  mandate: "You MUST strictly follow all listed 'strict_rules' and 'prompt_instructions' when formatting your final response to the user."
}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "0.85rem 1.75rem",
                borderTop: "1px solid rgba(40, 40, 40, 0.06)",
                display: "flex",
                justifyContent: "flex-end",
                background: "#FAFAFA",
              }}
            >
              <button
                type="button"
                onClick={() => setPreviewPlaybook(null)}
                className="pill-btn pill-btn-solid pill-btn-sm"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modal: Delete Playbook Confirmation                                       */}
      {/* ========================================================================= */}
      {deletePlaybook && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletePlaybook(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 10, 10, 0.45)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "1rem",
            overflowY: "auto",
          }}
        >
          <div
            className="frosted-panel"
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "#FFFFFF",
              padding: "2rem",
              borderRadius: "var(--radius-xl)",
              position: "relative",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                color: "#DC2626",
                background: "rgba(220, 38, 38, 0.08)",
                padding: "0.25rem 0.65rem",
                borderRadius: "var(--radius-pill)",
                fontSize: "0.72rem",
                fontWeight: 600,
                marginBottom: "0.75rem",
              }}
            >
              <AlertTriangle size={13} />
              <span>Permanent Deletion</span>
            </div>

            <h2 style={{ fontSize: "1.35rem", fontWeight: 400, marginBottom: "0.35rem", color: "#DC2626" }}>
              Delete AI Guidance Playbook
            </h2>
            <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
              Are you sure you want to permanently delete <strong>{deletePlaybook.title}</strong>? AI models will no longer be able to discover or enforce these strict rules.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setDeletePlaybook(null)}
                className="pill-btn pill-btn-glass"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeletePlaybook}
                className="pill-btn"
                style={{ background: "#DC2626", color: "#FFFFFF", border: "none" }}
              >
                {actionLoading ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
