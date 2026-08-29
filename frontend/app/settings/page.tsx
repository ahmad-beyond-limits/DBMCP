"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { User } from "@/lib/types";
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
} from "lucide-react";

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

  // Delete Account Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
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

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "65vh" }}>
        <div style={{ color: "var(--text-tertiary)", fontSize: "0.95rem" }}>Loading settings...</div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: "880px",
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
          Manage your personal identity, security credentials, and account life-cycle.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Card 1: Profile & Identity */}
        <div className="frosted-panel" style={{ padding: "clamp(1.5rem, 3.5vw, 2rem)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "1.25rem" }}>
            <div className="icon-circle-btn" style={{ width: "36px", height: "36px" }}>
              <UserIcon size={16} strokeWidth={1.5} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 400, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                Profile & Identity
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
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
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
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
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
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
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
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

        {/* Card 2: Security & Password */}
        <div className="frosted-panel" style={{ padding: "clamp(1.5rem, 3.5vw, 2rem)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "1.25rem" }}>
            <div className="icon-circle-btn" style={{ width: "36px", height: "36px" }}>
              <KeyRound size={16} strokeWidth={1.5} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 400, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                Password & Authentication
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
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
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
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
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
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
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
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

        {/* Card 3: Session & Security Status */}
        <div className="frosted-panel" style={{ padding: "clamp(1.5rem, 3.5vw, 2rem)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "1.25rem" }}>
            <div className="icon-circle-btn" style={{ width: "36px", height: "36px" }}>
              <ShieldCheck size={16} strokeWidth={1.5} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 400, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                Session & Metadata
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Cryptographic security session state and tenant details.
              </p>
            </div>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            padding: "1rem",
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

        {/* Card 4: Danger Zone (Account Deletion) */}
        <div style={{
          padding: "clamp(1.5rem, 3.5vw, 2rem)",
          borderRadius: "var(--radius-xl)",
          background: "rgba(239, 68, 68, 0.03)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "1rem" }}>
            <div className="icon-circle-btn" style={{ width: "36px", height: "36px", color: "#EF4444", background: "rgba(239, 68, 68, 0.1)" }}>
              <ShieldAlert size={16} strokeWidth={1.5} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 400, color: "#EF4444", letterSpacing: "-0.02em" }}>
                Danger Zone
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
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
              }}
            >
              <ShieldAlert size={14} strokeWidth={1.5} />
              <span>Delete User Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Double-Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 10, 10, 0.45)",
          backdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 200,
          padding: "1rem",
        }}>
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: "460px",
            background: "#FFFFFF",
            padding: "2rem",
            borderRadius: "var(--radius-xl)",
            position: "relative",
            boxShadow: "var(--shadow-xl)",
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
              }}
            >
              <X size={14} strokeWidth={1.5} />
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
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: "0.75rem",
            }}>
              <AlertTriangle size={13} />
              <span>Irreversible Action</span>
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
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
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
