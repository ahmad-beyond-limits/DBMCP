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
  Pencil,
  User as UserIcon,
  StickyNote,
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

  // User Profile Name Edit State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

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
      setEditFirstName(currentUser.first_name || "");
      setEditLastName(currentUser.last_name || "");
      setWorkspaces(wsList);
    } catch (err: any) {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLastName.trim()) {
      setProfileError("Last name is required.");
      return;
    }
    setUpdatingProfile(true);
    setProfileError(null);
    try {
      const updated = await api.updateMe({
        first_name: editFirstName.trim() || undefined,
        last_name: editLastName.trim() || undefined,
      });
      setUser(updated);
      setShowProfileModal(false);
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile");
    } finally {
      setUpdatingProfile(false);
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

  const sortedWorkspaces = [...filteredWorkspaces].sort((a, b) => {
    const aIsNotes = a.name.toLowerCase() === "notes";
    const bIsNotes = b.name.toLowerCase() === "notes";
    if (aIsNotes && !bIsNotes) return -1;
    if (!aIsNotes && bIsNotes) return 1;
    return 0;
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
            <h1 className="font-hero" style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)", letterSpacing: "-0.04em", color: "var(--text-primary)" }}>
              Welcome, {user?.last_name ? user.last_name : "User"}
            </h1>
            <button
              onClick={() => {
                setEditFirstName(user?.first_name || "");
                setEditLastName(user?.last_name || "");
                setProfileError(null);
                setShowProfileModal(true);
              }}
              className="icon-circle-btn"
              style={{ width: "32px", height: "32px", border: "1px solid rgba(40, 40, 40, 0.1)" }}
              title="Update First & Last Name"
              aria-label="Update Name"
            >
              <Pencil size={13} strokeWidth={1.5} />
            </button>
          </div>
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
            Active connected AI tokens
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
            {searchQuery
              ? "No matching workspaces"
              : filter === "member"
              ? "No shared workspaces yet"
              : filter === "owner"
              ? "No owned workspaces"
              : "No workspaces yet"}
          </h3>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "420px", margin: "0 auto 1.75rem auto", lineHeight: 1.6 }}>
            {searchQuery
              ? `No workspaces found matching "${searchQuery}". Try adjusting your keywords or clearing the search.`
              : filter === "member"
              ? "Workspaces that other team members share with you will appear here."
              : filter === "owner"
              ? "You haven't created any workspaces yet. Create one to begin managing AI access policies."
              : "Create your first workspace to begin uploading documents and creating AI MCP links."}
          </p>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="pill-btn pill-btn-glass"
            >
              Clear Search
            </button>
          ) : filter === "member" ? (
            workspaces.length > 0 && (
              <button
                onClick={() => setFilter("all")}
                className="pill-btn pill-btn-glass"
              >
                View All Workspaces
              </button>
            )
          ) : (
            <button
              onClick={() => setShowCreateModal(true)}
              className="pill-btn pill-btn-solid"
            >
              <Plus size={15} strokeWidth={1.5} />
              {workspaces.length === 0 ? "Create Your First Workspace" : "Create Workspace"}
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: "1.25rem",
        }}>
          {sortedWorkspaces.map((ws) => {
            const isNotesWs = ws.name.toLowerCase() === "notes";

            if (isNotesWs) {
              return (
                <Link
                  key={ws.id}
                  href={`/workspaces/${ws.id}`}
                  className="frosted-panel notes-workspace-card"
                  style={{
                    textDecoration: "none",
                    padding: "clamp(1.5rem, 3.5vw, 2rem)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "220px",
                    background: "radial-gradient(circle at 85% 18%, rgba(255, 205, 215, 0.45) 0%, transparent 55%), radial-gradient(circle at 15% 85%, rgba(225, 29, 72, 0.5) 0%, transparent 60%), linear-gradient(135deg, #FF6080 0%, #FF2E55 48%, #D4113E 100%)",
                    boxShadow: "0 16px 36px -8px rgba(244, 43, 84, 0.38), 0 4px 14px rgba(0, 0, 0, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.38)",
                    position: "relative",
                    overflow: "hidden",
                    color: "#FFFFFF",
                    transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  {/* Glowing Concentric Radar / Sonar Rings (from reference image) */}
                  <div
                    style={{
                      position: "absolute",
                      right: "-12px",
                      top: "16px",
                      width: "135px",
                      height: "135px",
                      pointerEvents: "none",
                      opacity: 0.35,
                    }}
                  >
                    <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none">
                      <circle cx="50" cy="50" r="46" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                      <circle cx="50" cy="50" r="33" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
                      <circle cx="50" cy="50" r="18" fill="rgba(255, 255, 255, 0.25)" stroke="#FFFFFF" strokeWidth="2.5" />
                      <circle cx="50" cy="50" r="6" fill="#FACC15" />
                    </svg>
                  </div>

                  <div>
                    {/* Top Row: Icon & Status Badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", position: "relative", zIndex: 2 }}>
                      <div
                        className="icon-circle-btn"
                        style={{
                          width: "42px",
                          height: "42px",
                          background: "rgba(255, 255, 255, 0.22)",
                          border: "1px solid rgba(255, 255, 255, 0.35)",
                          color: "#FFFFFF",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                        }}
                      >
                        <StickyNote size={18} strokeWidth={1.75} />
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                        <span
                          className="badge-status"
                          style={{
                            background: "rgba(255, 255, 255, 0.24)",
                            color: "#FFFFFF",
                            border: "1px solid rgba(255, 255, 255, 0.3)",
                            backdropFilter: "blur(8px)",
                            fontWeight: 500,
                          }}
                        >
                          Notes Vault
                        </span>
                        <span
                          className="badge-status"
                          style={{
                            background: "rgba(0, 0, 0, 0.18)",
                            color: "#FFFFFF",
                            backdropFilter: "blur(8px)",
                          }}
                        >
                          {ws.role === "OWNER" ? "Owner" : "Member"}
                        </span>
                      </div>
                    </div>

                    {/* Text Hierarchy: Preserving exact font, sizes, and layout */}
                    <div style={{ position: "relative", zIndex: 2, maxWidth: "66%" }}>
                      <h3 style={{
                        fontSize: "1.2rem",
                        fontWeight: 400,
                        color: "#FFFFFF",
                        marginBottom: "0.25rem",
                        letterSpacing: "-0.02em",
                        textShadow: "0 1px 2px rgba(0, 0, 0, 0.12)",
                      }}>
                        {ws.name}
                      </h3>
                      {ws.description && (
                        <p style={{
                          fontSize: "0.84rem",
                          color: "rgba(255, 255, 255, 0.92)",
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
                        color: "rgba(255, 255, 255, 0.72)",
                        fontFamily: "JetBrains Mono, monospace",
                        marginBottom: "1rem",
                      }}>
                        ID: {ws.id.slice(0, 8)}...
                      </p>
                    </div>

                    {/* Prominent Layered Notes Illustration (Positioned on the right, below the circle radar lines) */}
                    <div
                      style={{
                        position: "absolute",
                        right: "1.65rem",
                        bottom: "3.4rem",
                        width: "68px",
                        height: "76px",
                        pointerEvents: "none",
                        zIndex: 2,
                        filter: "drop-shadow(0 10px 22px rgba(0, 0, 0, 0.22))",
                      }}
                    >
                      {/* Back note sheet */}
                      <div
                        style={{
                          position: "absolute",
                          left: "0px",
                          top: "6px",
                          width: "48px",
                          height: "60px",
                          background: "rgba(255, 255, 255, 0.78)",
                          backdropFilter: "blur(6px)",
                          borderRadius: "7px",
                          transform: "rotate(-12deg)",
                          border: "1px solid rgba(255, 255, 255, 0.6)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                        }}
                      />
                      {/* Front note sheet with content lines */}
                      <div
                        style={{
                          position: "absolute",
                          left: "14px",
                          top: "0px",
                          width: "52px",
                          height: "64px",
                          background: "#FFFFFF",
                          borderRadius: "8px",
                          transform: "rotate(6deg)",
                          border: "1px solid rgba(255, 255, 255, 0.95)",
                          boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
                          padding: "7px 6px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        {/* Red header accent bar */}
                        <div style={{ width: "22px", height: "4px", background: "#E11D48", borderRadius: "2px", marginBottom: "2px" }} />
                        {/* Ruled lines */}
                        <div style={{ width: "36px", height: "3px", background: "#CBD5E1", borderRadius: "1.5px" }} />
                        <div style={{ width: "28px", height: "3px", background: "#CBD5E1", borderRadius: "1.5px" }} />
                        <div style={{ width: "34px", height: "3px", background: "#CBD5E1", borderRadius: "1.5px" }} />
                        <div style={{ width: "20px", height: "3px", background: "#E2E8F0", borderRadius: "1.5px" }} />
                      </div>
                    </div>
                  </div>

                  {/* Footer Row */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "0.85rem",
                    borderTop: "1px solid rgba(255, 255, 255, 0.22)",
                    position: "relative",
                    zIndex: 2,
                  }}>
                    <div style={{ display: "flex", gap: "0.85rem", fontSize: "0.78rem", color: "rgba(255, 255, 255, 0.88)" }}>
                      <span>{ws.notes_count || 0} Notes</span>
                      <span>•</span>
                      <span>{ws.credentials_count || 0} Links</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#FFFFFF", fontSize: "0.82rem", fontWeight: 550 }}>
                      <span>Open</span>
                      <ArrowRight size={13} strokeWidth={2} />
                    </div>
                  </div>
                </Link>
              );
            }

            return (
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
            );
          })}
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

      {/* Update Profile Name Modal */}
      {showProfileModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 10, 10, 0.4)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "1rem",
        }}>
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: "460px",
            background: "#FFFFFF",
            padding: "2rem",
            borderRadius: "var(--radius-lg)",
            position: "relative",
            boxShadow: "var(--shadow-xl)",
            animation: "fadeIn 0.2s ease-out",
          }}>
            <button
              onClick={() => setShowProfileModal(false)}
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

            <div className="slash-tag">USER PROFILE</div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 400, marginBottom: "1.5rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Profile Name
            </h2>

            {profileError && (
              <div style={{
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-sm)",
                background: "var(--status-deny-bg)",
                color: "var(--status-deny)",
                fontSize: "0.82rem",
                marginBottom: "1.25rem",
              }}>
                {profileError}
              </div>
            )}

            <form onSubmit={handleUpdateProfile}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", marginBottom: "1.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ali"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="modern-input"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                    Last Name <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hassan"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="modern-input"
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="pill-btn pill-btn-glass"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingProfile || !editLastName.trim()}
                  className="pill-btn pill-btn-solid"
                >
                  {updatingProfile ? "Saving..." : "Save Name"}
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
