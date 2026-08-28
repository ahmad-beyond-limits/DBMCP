"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { User, Workspace } from "@/lib/types";
import { FolderGit2, Plus, ArrowRight, ArrowUpRight, X, Shield, FileText, Key, LogOut } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "owner" | "member">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [currentUser, wsList] = await Promise.all([
        api.getMe(),
        api.getWorkspaces(),
      ]);
      setUser(currentUser);
      setWorkspaces(wsList);
    } catch (err: any) {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setCreating(true);
    setError(null);
    try {
      const created = await api.createWorkspace(newWorkspaceName.trim());
      setWorkspaces((prev) => [created, ...prev]);
      setShowCreateModal(false);
      setNewWorkspaceName("");
      router.push(`/workspaces/${created.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  const filteredWorkspaces = workspaces.filter((ws) => {
    const matchesFilter =
      filter === "all" ? true :
      filter === "owner" ? ws.role === "OWNER" :
      ws.role === "MEMBER";
    const matchesSearch = ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ws.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalFiles = workspaces.reduce((acc, ws) => acc + (ws.files_count || 0), 0);
  const totalPolicies = workspaces.reduce((acc, ws) => acc + (ws.policies_count || 0), 0);
  const totalKeys = workspaces.reduce((acc, ws) => acc + (ws.credentials_count || 0), 0);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "65vh" }}>
        <div style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Loading workspaces...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "3rem 2rem 5rem 2rem" }}>
      {/* Top Banner with Clean Greeting & Actions */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: "2.5rem",
        paddingBottom: "1.75rem",
        borderBottom: "1px solid var(--border-card)",
        flexWrap: "wrap",
        gap: "1.25rem",
      }}>
        <div>
          <div className="slash-tag">WORKSPACES DIRECTORY</div>
          <h1 className="font-editorial" style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
            Data Workspaces
          </h1>
          <p style={{ fontSize: "0.92rem", color: "var(--text-secondary)" }}>
            Signed in as <strong style={{ color: "#0f172a" }}>{user?.username}</strong>. Each workspace has isolated documents, policies, and MCP sharing links.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowCreateModal(true)}
            className="pill-btn pill-btn-primary"
            style={{ padding: "0.65rem 1.35rem" }}
          >
            <Plus size={15} />
            Create Workspace
          </button>
        </div>
      </div>

      {/* Radiant Metric Overview Cards (Inspired by Reference Images 2, 3, 4) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "1.25rem",
        marginBottom: "2.5rem",
      }}>
        <div className="frosted-panel" style={{ padding: "1.5rem 1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Workspaces
            </span>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FolderGit2 size={15} color="#0f172a" />
            </div>
          </div>
          <div className="font-editorial" style={{ fontSize: "2.2rem", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{workspaces.length}</div>
        </div>

        <div className="frosted-panel" style={{ padding: "1.5rem 1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Uploaded Files
            </span>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={15} color="#059669" />
            </div>
          </div>
          <div className="font-editorial" style={{ fontSize: "2.2rem", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{totalFiles}</div>
        </div>

        <div className="frosted-panel" style={{ padding: "1.5rem 1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Active Rules
            </span>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={15} color="#d97706" />
            </div>
          </div>
          <div className="font-editorial" style={{ fontSize: "2.2rem", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{totalPolicies}</div>
        </div>

        <div className="frosted-panel" style={{ padding: "1.5rem 1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Live MCP Links
            </span>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Key size={15} color="#2563eb" />
            </div>
          </div>
          <div className="font-editorial" style={{ fontSize: "2.2rem", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{totalKeys}</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2rem",
        flexWrap: "wrap",
        gap: "1rem",
      }}>
        <div className="pill-tabs-bar">
          <button
            onClick={() => setFilter("all")}
            className={`pill-tab ${filter === "all" ? "active" : ""}`}
          >
            All ({workspaces.length})
          </button>
          <button
            onClick={() => setFilter("owner")}
            className={`pill-tab ${filter === "owner" ? "active" : ""}`}
          >
            Personal
          </button>
          <button
            onClick={() => setFilter("member")}
            className={`pill-tab ${filter === "member" ? "active" : ""}`}
          >
            Shared
          </button>
        </div>

        <div style={{ width: "100%", maxWidth: "300px" }}>
          <input
            type="text"
            className="modern-input"
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: "0.5rem 0.9rem", fontSize: "0.85rem" }}
          />
        </div>
      </div>

      {/* Workspaces Grid */}
      {filteredWorkspaces.length === 0 ? (
        <div className="frosted-panel" style={{ textAlign: "center", padding: "4.5rem 2rem" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "#f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem auto",
            color: "#475569",
          }}>
            <FolderGit2 size={24} />
          </div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.4rem" }}>
            {searchQuery ? "No matching workspaces" : "No workspaces yet"}
          </h2>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "440px", margin: "0 auto 1.75rem auto", lineHeight: 1.5 }}>
            Create a workspace to start uploading documents, configuring permissions, and connecting AI models.
          </p>
          <button onClick={() => setShowCreateModal(true)} className="pill-btn pill-btn-primary">
            <Plus size={15} />
            Create Workspace
          </button>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: "1.5rem",
        }}>
          {filteredWorkspaces.map((ws) => (
            <div
              key={ws.id}
              onClick={() => router.push(`/workspaces/${ws.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") router.push(`/workspaces/${ws.id}`); }}
              className="frosted-panel"
              style={{
                height: "100%",
                padding: "1.75rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                cursor: "pointer",
                position: "relative",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#2563eb";
                e.currentTarget.style.boxShadow = "0 12px 32px -6px rgba(37, 99, 235, 0.14)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-card)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>
                    {ws.name}
                  </h3>
                  <div className="circle-action-btn" style={{ width: "30px", height: "30px" }}>
                    <ArrowUpRight size={14} />
                  </div>
                </div>

                <div style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  fontFamily: "JetBrains Mono, monospace",
                  marginBottom: "1.5rem",
                }}>
                  ID: {ws.id.substring(0, 18)}...
                </div>
              </div>

              <div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  background: "#f8fafc",
                  borderRadius: "var(--radius-md)",
                  textAlign: "center",
                  marginBottom: "1.25rem",
                  border: "1px solid var(--border-subtle)",
                }}>
                  <div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>{ws.files_count}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Files</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>{ws.policies_count}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Policies</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>{ws.credentials_count}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Keys</div>
                  </div>
                </div>

                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid var(--border-subtle)",
                }}>
                  <span className={`badge-status ${ws.role === "OWNER" ? "badge-status-allow" : "badge-status-transform"}`}>
                    {ws.role}
                  </span>
                  <span style={{
                    color: "#2563eb",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}>
                    Manage <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Workspace */}
      {showCreateModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "1.5rem",
        }}>
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: "480px",
            padding: "2.5rem 2.25rem",
            position: "relative",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius-xl)",
          }}>
            <button
              onClick={() => setShowCreateModal(false)}
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

            <div className="slash-tag">NEW WORKSPACE</div>
            <h2 className="font-editorial" style={{ fontSize: "1.6rem", marginBottom: "0.4rem" }}>
              Create Workspace
            </h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.75rem" }}>
              Workspaces are cryptographically isolated environments for your files, policies, and MCP keys.
            </p>

            {error && (
              <div style={{
                background: "var(--status-deny-bg)",
                border: "1px solid #fecaca",
                color: "var(--status-deny)",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
                marginBottom: "1.5rem",
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateWorkspace}>
              <div style={{ marginBottom: "1.75rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  className="modern-input"
                  placeholder="e.g. Sales Intelligence or Legal Vault"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="pill-btn pill-btn-dark"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="pill-btn pill-btn-primary"
                >
                  {creating ? "Creating..." : "Create Workspace"}
                  <div className="btn-arrow-circle">
                    <ArrowRight size={12} />
                  </div>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
