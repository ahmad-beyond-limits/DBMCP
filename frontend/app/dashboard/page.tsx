"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { User, Workspace } from "@/lib/types";
import {
  FolderGit2,
  Plus,
  ArrowRight,
  ArrowUpRight,
  X,
  Shield,
  FileText,
  Key,
  Search,
} from "lucide-react";

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
  const totalKeys = workspaces.reduce((acc, ws) => acc + (ws.credentials_count || 0), 0);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "65vh" }}>
        <div style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Loading workspaces...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "clamp(1.5rem, 3vw, 2.5rem) clamp(1rem, 3vw, 1.5rem) 5rem clamp(1rem, 3vw, 1.5rem)" }}>
      {/* Top Banner with Clean Greeting & Actions */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: "2.5rem",
        paddingBottom: "1.5rem",
        borderBottom: "1px solid var(--glass-border-subtle)",
        flexWrap: "wrap",
        gap: "1.25rem",
      }}>
        <div>
          <div className="slash-tag">WORKSPACES DIRECTORY</div>
          <h1 className="font-hero" style={{ fontSize: "clamp(1.8rem, 3.2vw, 2.5rem)", letterSpacing: "-0.025em", marginBottom: "0.3rem", color: "var(--color-obsidian)" }}>
            Data Workspaces
          </h1>
          <p style={{ fontSize: "0.92rem", color: "var(--text-secondary)" }}>
            Signed in as <strong style={{ color: "var(--color-obsidian)" }}>{user?.username}</strong>. Each workspace has isolated documents, policies, and MCP sharing links.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowCreateModal(true)}
            className="pill-btn pill-btn-solid"
            style={{ padding: "0.65rem 1.4rem" }}
          >
            <Plus size={16} />
            <span>Create Workspace</span>
          </button>
        </div>
      </div>

      {/* 3 Consistent Frosted Glass Metric Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
        gap: "1.5rem",
        marginBottom: "2.5rem",
      }}>
        {/* Card 1: Total Workspaces */}
        <div className="frosted-panel" style={{ padding: "clamp(1.25rem, 3vw, 1.85rem)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
              <div style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "var(--accent-lime-bg)",
                border: "1px solid var(--accent-lime-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-lime)",
              }}>
                <FolderGit2 size={16} />
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--accent-lime)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>
                  DATA VAULTS
                </div>
                <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--color-obsidian)" }}>Active Workspaces</div>
              </div>
            </div>
            <div className="circle-action-btn">
              <ArrowUpRight size={15} />
            </div>
          </div>

          <div style={{ fontSize: "clamp(2rem, 4vw, 2.5rem)", fontWeight: 700, lineHeight: 1, marginBottom: "0.5rem", color: "var(--color-obsidian)" }}>
            {workspaces.length}
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Isolated environments configured
          </div>
        </div>

        {/* Card 2: Protected Documents */}
        <div className="frosted-panel" style={{ padding: "clamp(1.25rem, 3vw, 1.85rem)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
              <div style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "var(--accent-lime-bg)",
                border: "1px solid var(--accent-lime-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-lime)",
              }}>
                <FileText size={16} />
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--accent-lime)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>
                  DOCUMENT STORE
                </div>
                <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--color-obsidian)" }}>Protected Files</div>
              </div>
            </div>
            <div className="circle-action-btn">
              <ArrowUpRight size={15} />
            </div>
          </div>

          <div style={{ fontSize: "clamp(2rem, 4vw, 2.5rem)", fontWeight: 700, lineHeight: 1, marginBottom: "0.5rem", color: "var(--color-obsidian)" }}>
            {totalFiles}
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Indexed for AI retrieval
          </div>
        </div>

        {/* Card 3: Active AI Links */}
        <div className="frosted-panel" style={{ padding: "clamp(1.25rem, 3vw, 1.85rem)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
              <div style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "var(--accent-lime-bg)",
                border: "1px solid var(--accent-lime-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-lime)",
              }}>
                <Key size={16} />
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--accent-lime)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>
                  AI CONNECTORS
                </div>
                <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--color-obsidian)" }}>Active MCP Links</div>
              </div>
            </div>
            <div className="circle-action-btn">
              <ArrowUpRight size={15} />
            </div>
          </div>

          <div style={{ fontSize: "clamp(2rem, 4vw, 2.5rem)", fontWeight: 700, lineHeight: 1, marginBottom: "0.5rem", color: "var(--color-obsidian)" }}>
            {totalKeys}
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Live tokens for Claude &amp; Cursor
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
            Owned by Me
          </button>
          <button
            onClick={() => setFilter("member")}
            className={`pill-tab ${filter === "member" ? "active" : ""}`}
          >
            Shared with Me
          </button>
        </div>

        <div style={{ position: "relative", minWidth: "240px", flex: "1 1 240px", maxWidth: "360px" }}>
          <Search size={15} color="var(--text-dim)" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="modern-input"
            style={{ paddingLeft: "2.5rem", borderRadius: "var(--radius-pill)", fontSize: "0.85rem" }}
          />
        </div>
      </div>

      {/* Workspaces Grid */}
      {filteredWorkspaces.length === 0 ? (
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
            <FolderGit2 size={26} />
          </div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: 600, marginBottom: "0.4rem", color: "var(--color-obsidian)" }}>
            No workspaces found
          </h3>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", maxWidth: "440px", margin: "0 auto 1.75rem auto", lineHeight: 1.6 }}>
            {searchQuery ? "No workspaces match your search criteria." : "Create your first workspace to start uploading documents and sharing MCP links with AI."}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="pill-btn pill-btn-solid"
          >
            <Plus size={15} />
            Create Your First Workspace
          </button>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
          gap: "1.5rem",
        }}>
          {filteredWorkspaces.map((ws) => (
            <div
              key={ws.id}
              onClick={() => router.push(`/workspaces/${ws.id}`)}
              className="frosted-panel"
              style={{
                padding: "clamp(1.25rem, 3vw, 1.85rem)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "190px",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                  <span className={`badge-status ${ws.is_active ? "badge-status-allow" : "badge-status-deny"}`}>
                    {ws.is_active ? "Active Vault" : "Disabled"}
                  </span>
                  <div className="circle-action-btn">
                    <ArrowUpRight size={15} />
                  </div>
                </div>

                <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.4rem", color: "var(--color-obsidian)" }}>
                  {ws.name}
                </h3>
                <div style={{ fontSize: "0.78rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-dim)", marginBottom: "1.5rem" }}>
                  ID: {ws.id.substring(0, 16)}...
                </div>
              </div>

              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "1.1rem",
                borderTop: "1px solid var(--glass-border-subtle)",
                fontSize: "0.82rem",
                color: "var(--text-muted)",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <span><strong style={{ color: "var(--color-obsidian)" }}>{ws.files_count || 0}</strong> Files</span>
                  <span><strong style={{ color: "var(--color-obsidian)" }}>{ws.credentials_count || 0}</strong> MCP Links</span>
                </div>
                <span style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: ws.role === "OWNER" ? "var(--accent-lime)" : "var(--text-secondary)",
                }}>
                  {ws.role}
                </span>
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
            maxWidth: "460px",
            padding: "clamp(1.75rem, 4vw, 2.5rem) clamp(1.25rem, 3vw, 2.25rem)",
            position: "relative",
            background: "#ffffff",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius-xl)",
          }}>
            <button
              onClick={() => setShowCreateModal(false)}
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

            <div className="slash-tag">NEW VAULT</div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "0.4rem", color: "var(--color-obsidian)" }}>
              Create Workspace
            </h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginBottom: "1.75rem", lineHeight: 1.5 }}>
              Set up a secure, isolated vault for your enterprise documents and AI agents.
            </p>

            {error && (
              <div style={{
                background: "var(--status-deny-bg)",
                border: "1px solid rgba(220, 38, 38, 0.2)",
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
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", marginBottom: "0.45rem", color: "var(--color-obsidian)" }}>
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  className="modern-input"
                  placeholder="e.g. Finance Vault or HR Policies"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="pill-btn pill-btn-glass"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newWorkspaceName.trim()}
                  className="pill-btn pill-btn-solid"
                >
                  {creating ? "Creating..." : "Initialize Workspace"}
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
