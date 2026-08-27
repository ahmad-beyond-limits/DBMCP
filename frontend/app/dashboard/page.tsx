"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { User, Workspace } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>Loading workspaces...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2.5rem 2rem" }}>
      {/* Top Banner with User Greeting & Actions */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2.5rem",
        paddingBottom: "1.5rem",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
            Workspace Hub
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Welcome back, <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{user?.username}</span>. Manage your isolated AI data boundaries.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            + Create Workspace
          </button>
          <button
            onClick={() => api.logout()}
            className="btn-secondary"
            style={{ fontSize: "0.85rem", padding: "0.6rem 1rem" }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Workspaces Grid */}
      {workspaces.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📂</div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.5rem" }}>No workspaces yet</h2>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "450px", margin: "0 auto 1.5rem auto" }}>
            Create your first workspace to upload documents, configure policy boundaries, and generate private MCP credentials.
          </p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            Create First Workspace
          </button>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "1.5rem",
        }}>
          {workspaces.map((ws) => (
            <Link key={ws.id} href={`/workspaces/${ws.id}`}>
              <div className="glass-card" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {ws.name}
                    </h3>
                    <span className={`badge ${ws.role === "OWNER" ? "badge-allow" : "badge-neutral"}`}>
                      {ws.role}
                    </span>
                  </div>

                  <div style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    fontFamily: "JetBrains Mono, monospace",
                    marginBottom: "1.5rem",
                    wordBreak: "break-all",
                  }}>
                    ID: {ws.id.substring(0, 18)}...
                  </div>
                </div>

                <div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "0.5rem",
                    padding: "0.75rem",
                    background: "rgba(10, 14, 23, 0.4)",
                    borderRadius: "var(--radius-sm)",
                    textAlign: "center",
                    marginBottom: "1rem",
                  }}>
                    <div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>{ws.files_count}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Files</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#818cf8" }}>{ws.policies_count}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Policies</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#34d399" }}>{ws.credentials_count}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>MCP Keys</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    <span>Created: {new Date(ws.created_at).toLocaleDateString()}</span>
                    <span style={{ color: "var(--accent-primary)", fontWeight: 600 }}>Open Console →</span>
                  </div>
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
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "1rem",
        }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "460px", padding: "2rem" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Create New Workspace
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Workspaces are primary security boundaries. Documents and policies in this workspace are completely isolated from others.
            </p>

            {error && (
              <div style={{
                background: "var(--status-deny-bg)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                color: "var(--status-deny)",
                padding: "0.6rem 0.8rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
                marginBottom: "1rem",
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateWorkspace}>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="form-input"
                  placeholder="e.g. Legal Documents 2026 or Customer Data"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary"
                >
                  {creating ? "Creating..." : "Create Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
