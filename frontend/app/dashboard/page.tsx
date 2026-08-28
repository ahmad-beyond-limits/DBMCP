"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { User, Workspace } from "@/lib/types";
import { FolderGit2, Plus, ArrowRight, X, Shield, FileText, Key, LogOut } from "lucide-react";

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
      setShowCreateModal(false);
      setNewWorkspaceName("");
      router.push(`/workspaces/${created.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  // Filter workspaces
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
        <div className="callout-pin" style={{ position: "static", animation: "none" }}>
          <span className="pin-icon-circle">+</span>
          <span>Loading Isolated Workspaces...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "3rem 2rem 5rem 2rem" }}>
      {/* Top Banner with User Greeting & Actions (Reference 2 Editorial Style) */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: "2.5rem",
        paddingBottom: "2rem",
        borderBottom: "1px solid var(--border-subtle)",
        flexWrap: "wrap",
        gap: "1.5rem",
      }}>
        <div>
          <div className="slash-tag">MANAGEMENT CONSOLE</div>
          <h1 className="font-editorial" style={{ fontSize: "clamp(2rem, 3vw, 2.75rem)", letterSpacing: "-0.02em", marginBottom: "0.4rem" }}>
            Workspace Hub
          </h1>
          <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
            Welcome back, <span style={{ color: "#38bdf8", fontWeight: 700 }}>{user?.username}</span>. Manage your isolated AI data boundaries.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowCreateModal(true)}
            className="pill-btn pill-btn-primary"
          >
            <Plus size={16} />
            Create Workspace
          </button>
          <button
            onClick={() => api.logout()}
            className="pill-btn pill-btn-dark"
            style={{ padding: "0.6rem 1.1rem" }}
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Top Metrics Row (Reference 2 Cards) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1.25rem",
        marginBottom: "3rem",
      }}>
        <div className="frosted-panel" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Workspaces
            </span>
            <FolderGit2 size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#f8fafc" }}>{workspaces.length}</div>
        </div>

        <div className="frosted-panel" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Isolated Documents
            </span>
            <FileText size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#10b981" }}>{totalFiles}</div>
        </div>

        <div className="frosted-panel" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Active Policies
            </span>
            <Shield size={18} color="#818cf8" />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#818cf8" }}>{totalPolicies}</div>
        </div>

        <div className="frosted-panel" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Live MCP Tokens
            </span>
            <Key size={18} color="#fbbf24" />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#fbbf24" }}>{totalKeys}</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar (Reference 1 Category Pills) */}
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
            All Workspaces ({workspaces.length})
          </button>
          <button
            onClick={() => setFilter("owner")}
            className={`pill-tab ${filter === "owner" ? "active" : ""}`}
          >
            Owned By Me
          </button>
          <button
            onClick={() => setFilter("member")}
            className={`pill-tab ${filter === "member" ? "active" : ""}`}
          >
            Shared With Me
          </button>
        </div>

        <div style={{ width: "100%", maxWidth: "320px" }}>
          <input
            type="text"
            className="modern-input"
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: "0.55rem 1rem", fontSize: "0.88rem" }}
          />
        </div>
      </div>

      {/* Workspaces Grid */}
      {filteredWorkspaces.length === 0 ? (
        <div className="frosted-panel" style={{ textAlign: "center", padding: "5rem 2rem" }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "rgba(56, 189, 248, 0.1)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem auto",
            color: "#38bdf8",
          }}>
            <FolderGit2 size={28} />
          </div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            {searchQuery ? "No matching workspaces found" : "No workspaces configured yet"}
          </h2>
          <p style={{ fontSize: "0.92rem", color: "var(--text-secondary)", maxWidth: "480px", margin: "0 auto 2rem auto", lineHeight: 1.6 }}>
            Create your first workspace to upload documents, configure policy boundaries, and generate private MCP credentials.
          </p>
          <button onClick={() => setShowCreateModal(true)} className="pill-btn pill-btn-cyan">
            <Plus size={16} />
            Create First Workspace
          </button>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: "1.75rem",
        }}>
          {filteredWorkspaces.map((ws) => (
            <Link key={ws.id} href={`/workspaces/${ws.id}`} style={{ textDecoration: "none" }}>
              <div className="frosted-panel" style={{
                height: "100%",
                padding: "2rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                cursor: "pointer",
              }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f8fafc" }}>
                      {ws.name}
                    </h3>
                    <span className={`badge-status ${ws.role === "OWNER" ? "badge-status-allow" : "badge-status-transform"}`}>
                      {ws.role}
                    </span>
                  </div>

                  <div style={{
                    fontSize: "0.76rem",
                    color: "var(--text-muted)",
                    fontFamily: "JetBrains Mono, monospace",
                    marginBottom: "1.75rem",
                  }}>
                    ID: {ws.id.substring(0, 20)}...
                  </div>
                </div>

                <div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "0.75rem",
                    padding: "0.9rem",
                    background: "rgba(10, 16, 28, 0.65)",
                    borderRadius: "var(--radius-md)",
                    textAlign: "center",
                    marginBottom: "1.5rem",
                    border: "1px solid var(--border-subtle)",
                  }}>
                    <div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#f8fafc" }}>{ws.files_count}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Files</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#818cf8" }}>{ws.policies_count}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Policies</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#38bdf8" }}>{ws.credentials_count}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>MCP Keys</div>
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
                    <span>{new Date(ws.created_at).toLocaleDateString()}</span>
                    <span style={{ color: "#38bdf8", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      Enter Console <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Frosted Create Workspace Modal (Reference 3 Glass Panel & Floating Close) */}
      {showCreateModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(3, 7, 18, 0.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "1.5rem",
        }}>
          <div className="frosted-panel frosted-panel-highlight" style={{
            width: "100%",
            maxWidth: "500px",
            padding: "2.75rem 2.5rem",
            position: "relative",
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.7), 0 0 35px rgba(56, 189, 248, 0.2)",
            borderRadius: "var(--radius-xl)",
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowCreateModal(false)}
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

            <div className="slash-tag">NEW ISOLATION BOUNDARY</div>
            <h2 className="font-editorial" style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
              Create Workspace
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.75rem", lineHeight: 1.5 }}>
              Workspaces are strict tenant barriers. Documents, policies, and MCP credentials in this workspace remain isolated from all other tenants.
            </p>

            {error && (
              <div style={{
                background: "var(--status-deny-bg)",
                border: "1px solid rgba(244, 63, 94, 0.35)",
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
              <div style={{ marginBottom: "2rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  marginBottom: "0.6rem",
                  color: "var(--text-secondary)",
                }}>
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="modern-input"
                  placeholder="e.g. Legal Contracts 2026 or Clinical Trial Data"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.85rem" }}>
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
                  className="pill-btn pill-btn-cyan"
                >
                  {creating ? "Creating..." : "Create & Initialize"}
                  <div className="btn-arrow-circle">
                    <ArrowRight size={13} />
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
