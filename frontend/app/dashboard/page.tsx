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
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState("");
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
      const created = await api.createWorkspace(
        newWorkspaceName.trim(),
        newWorkspaceDesc.trim() || undefined
      );
      setWorkspaces((prev) => [created, ...prev]);
      setShowCreateModal(false);
      setNewWorkspaceName("");
      setNewWorkspaceDesc("");
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
        <div style={{ color: "var(--text-tertiary)", fontSize: "0.95rem" }}>Loading workspaces...</div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: "1160px",
      margin: "0 auto",
      padding: "clamp(2rem, 4vw, 3rem) clamp(1rem, 3vw, 1.5rem) 5rem clamp(1rem, 3vw, 1.5rem)",
    }}>
      {/* Top Banner with Clean Editorial Greeting & Primary Action */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: "2.5rem",
        paddingBottom: "1.5rem",
        borderBottom: "1px solid rgba(40, 40, 40, 0.04)",
        flexWrap: "wrap",
        gap: "1.25rem",
      }}>
        <div>
          <div className="slash-tag">POAIS WORKSPACE VAULT</div>
          <h1 className="font-hero" style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)", letterSpacing: "-0.04em", color: "var(--text-primary)" }}>
            Welcome, {user?.username}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: "0.25rem", fontWeight: 400 }}>
            Manage your AI data workspaces, documents, and MCP connection policies.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="pill-btn pill-btn-solid"
          style={{ padding: "0.75rem 1.6rem", fontSize: "0.88rem" }}
        >
          <Plus size={15} strokeWidth={1.5} />
          <span>New Workspace</span>
        </button>
      </div>

      {/* 3 Metric Capsules: Refined Typography & Light Numbers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
        gap: "1.25rem",
        marginBottom: "2.5rem",
      }}>
        {/* Metric 1 */}
        <div className="frosted-panel" style={{ padding: "clamp(1.5rem, 3vw, 1.75rem)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 450, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Total Workspaces
            </span>
            <div className="icon-circle-btn" style={{ width: "38px", height: "38px" }}>
              <FolderGit2 size={16} strokeWidth={1.5} />
            </div>
          </div>
          <div style={{ fontSize: "2.75rem", fontWeight: 400, letterSpacing: "-0.05em", color: "var(--text-primary)", lineHeight: 1 }}>
            {workspaces.length}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", marginTop: "0.5rem" }}>
            Active policy boundaries
          </div>
        </div>

        {/* Metric 2 */}
        <div className="frosted-panel" style={{ padding: "clamp(1.5rem, 3vw, 1.75rem)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 450, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Active Documents
            </span>
            <div className="icon-circle-btn" style={{ width: "38px", height: "38px" }}>
              <FileText size={16} strokeWidth={1.5} />
            </div>
          </div>
          <div style={{ fontSize: "2.75rem", fontWeight: 400, letterSpacing: "-0.05em", color: "var(--text-primary)", lineHeight: 1 }}>
            {totalFiles}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", marginTop: "0.5rem" }}>
            Excel, CSV &amp; docs indexed
          </div>
        </div>

        {/* Metric 3 */}
        <div className="frosted-panel" style={{ padding: "clamp(1.5rem, 3vw, 1.75rem)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 450, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              AI MCP Links
            </span>
            <div className="icon-circle-btn" style={{ width: "38px", height: "38px" }}>
              <Key size={16} strokeWidth={1.5} />
            </div>
          </div>
          <div style={{ fontSize: "2.75rem", fontWeight: 400, letterSpacing: "-0.05em", color: "var(--text-primary)", lineHeight: 1 }}>
            {totalKeys}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", marginTop: "0.5rem" }}>
            Connected Claude &amp; Cursor tokens
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem",
        marginBottom: "1.75rem",
      }}>
        {/* Soft Pill Tabs */}
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

        {/* Search Input */}
        <div className="modern-search-bar" style={{ width: "100%", maxWidth: "300px" }}>
          <Search size={15} color="var(--text-tertiary)" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Workspaces Grid */}
      {filteredWorkspaces.length === 0 ? (
        <div className="frosted-panel" style={{ textAlign: "center", padding: "clamp(3rem, 6vw, 5rem) 1.5rem" }}>
          <div className="icon-circle-btn" style={{ width: "56px", height: "56px", margin: "0 auto 1.25rem auto" }}>
            <FolderGit2 size={24} strokeWidth={1.5} />
          </div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: 400, marginBottom: "0.4rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            {searchQuery ? "No matching workspaces found" : "No workspaces yet"}
          </h3>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "420px", margin: "0 auto 1.75rem auto", lineHeight: 1.6 }}>
            {searchQuery
              ? "Try adjusting your search query or clear the filter."
              : "Create your first workspace to begin uploading documents and creating AI MCP links."}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="pill-btn pill-btn-solid"
            >
              <Plus size={15} strokeWidth={1.5} />
              Create Your First Workspace
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: "1.25rem",
        }}>
          {filteredWorkspaces.map((ws) => (
            <Link
              key={ws.id}
              href={`/workspaces/${ws.id}`}
              className="frosted-panel"
              style={{
                textDecoration: "none",
                padding: "clamp(1.5rem, 3.5vw, 2rem)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "210px",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                  <div className="icon-circle-btn" style={{ width: "42px", height: "42px" }}>
                    <FolderGit2 size={18} strokeWidth={1.5} />
                  </div>
                  <span className="badge-status" style={{ background: ws.role === "OWNER" ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.04)" }}>
                    {ws.role === "OWNER" ? "Owner" : "Member"}
                  </span>
                </div>

                <h3 style={{
                  fontSize: "1.2rem",
                  fontWeight: 400,
                  color: "var(--text-primary)",
                  marginBottom: "0.25rem",
                  letterSpacing: "-0.02em",
                }}>
                  {ws.name}
                </h3>
                {ws.description && (
                  <p style={{
                    fontSize: "0.84rem",
                    color: "var(--text-secondary)",
                    marginBottom: "0.6rem",
                    lineHeight: 1.4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}>
                    {ws.description}
                  </p>
                )}
                <p style={{
                  fontSize: "0.78rem",
                  color: "var(--text-tertiary)",
                  fontFamily: "JetBrains Mono, monospace",
                  marginBottom: "1rem",
                }}>
                  ID: {ws.id.slice(0, 8)}...
                </p>
              </div>

              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "1rem",
                borderTop: "1px solid rgba(40, 40, 40, 0.04)",
              }}>
                <div style={{ display: "flex", gap: "0.85rem", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  <span>{ws.files_count || 0} Files</span>
                  <span>•</span>
                  <span>{ws.credentials_count || 0} Links</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-primary)", fontSize: "0.82rem", fontWeight: 450 }}>
                  <span>Open</span>
                  <ArrowRight size={13} strokeWidth={1.5} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(46, 48, 50, 0.35)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 150,
          padding: "1rem",
        }}>
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: "480px",
            padding: "clamp(1.75rem, 4vw, 2.5rem)",
            position: "relative",
            background: "#FFFFFF",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius-xl)",
          }}>
            <button
              onClick={() => setShowCreateModal(false)}
              className="icon-circle-btn"
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                width: "32px",
                height: "32px",
              }}
            >
              <X size={14} strokeWidth={1.5} />
            </button>

            <div className="slash-tag">NEW VAULT</div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 400, marginBottom: "0.3rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Create Workspace
            </h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.75rem", lineHeight: 1.5, fontWeight: 400 }}>
              Workspaces isolate documents, credentials, and policies from other projects.
            </p>

            {error && (
              <div style={{
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-sm)",
                background: "var(--status-deny-bg)",
                color: "var(--status-deny)",
                fontSize: "0.82rem",
                marginBottom: "1.25rem",
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateWorkspace}>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Analytics or Q3 Research"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="modern-input"
                />
              </div>

              <div style={{ marginBottom: "1.75rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  maxLength={255}
                  placeholder="e.g. Customer revenue trends & quarterly metrics vault"
                  value={newWorkspaceDesc}
                  onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                  className="modern-input"
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
                  {creating ? "Creating..." : "Create Workspace"}
                  <ArrowRight size={14} strokeWidth={1.5} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
