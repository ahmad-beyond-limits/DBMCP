"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { AdminStats, AdminUser, AdminWorkspace, User } from "@/lib/types";
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
} from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "workspaces">("users");

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

      const [statsData, usersData, workspacesData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminWorkspaces(),
      ]);

      setStats(statsData);
      setUsers(usersData);
      setWorkspaces(workspacesData);
    } catch (err: any) {
      router.push("/dashboard");
    } finally {
      setLoading(false);
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
    setActionLoading(true);
    setActionMsg(null);
    try {
      const res = await api.updateAdminUserStatus(user.id, { is_superuser: !user.is_superuser });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_superuser: res.is_superuser } : u))
      );
      setActionMsg({
        type: "success",
        text: `User '${user.username}' superadmin status updated.`,
      });
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to update superadmin role." });
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
        </div>

        {/* Search & Filter */}
        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", width: "100%", maxWidth: "450px" }}>
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

          <div className="modern-search-bar" style={{ flex: 1, minWidth: "200px" }}>
            <Search size={14} color="var(--text-tertiary)" strokeWidth={1.5} />
            <input
              type="text"
              placeholder={activeTab === "users" ? "Search users by name, username..." : "Search workspaces..."}
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
                          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                            <span style={{
                              fontSize: "0.72rem",
                              fontWeight: 500,
                              padding: "0.2rem 0.55rem",
                              borderRadius: "var(--radius-pill)",
                              background: u.is_superuser ? "rgba(99, 102, 241, 0.1)" : "rgba(0, 0, 0, 0.04)",
                              color: u.is_superuser ? "#4F46E5" : "var(--text-secondary)",
                            }}>
                              {u.is_superuser ? "Superadmin" : "Customer"}
                            </span>
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
    </div>
  );
}
