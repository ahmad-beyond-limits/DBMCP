"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Lock, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.login(username, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "calc(100vh - 160px)",
      padding: "2rem",
      position: "relative",
    }}>
      <div className="frosted-panel frosted-panel-highlight" style={{
        width: "100%",
        maxWidth: "460px",
        padding: "3rem 2.5rem",
        boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6), 0 0 35px rgba(56, 189, 248, 0.15)",
        borderRadius: "var(--radius-xl)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "2.25rem" }}>
          <div className="slash-tag" style={{ justifyContent: "center" }}>
            AUTHENTICATION
          </div>
          <h1 className="font-editorial" style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
            Sign In to Gateway
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Access policy-enforced AI workspaces &amp; MCP credentials
          </p>
        </div>

        {error && (
          <div style={{
            background: "var(--status-deny-bg)",
            border: "1px solid rgba(244, 63, 94, 0.35)",
            color: "var(--status-deny)",
            padding: "0.85rem 1.1rem",
            borderRadius: "var(--radius-md)",
            fontSize: "0.85rem",
            marginBottom: "1.75rem",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.35rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
              Username
            </label>
            <input
              type="text"
              required
              className="modern-input"
              placeholder="e.g. security_lead"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
              Password
            </label>
            <input
              type="password"
              required
              className="modern-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="pill-btn pill-btn-cyan"
            style={{ width: "100%", padding: "0.85rem", marginTop: "0.5rem", fontSize: "0.95rem" }}
          >
            {loading ? "Verifying Credentials..." : "Authenticate & Open Console"}
            <div className="btn-arrow-circle">
              <ArrowRight size={13} />
            </div>
          </button>
        </form>

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.4rem",
          marginTop: "2rem",
          fontSize: "0.78rem",
          color: "var(--text-muted)",
        }}>
          <ShieldCheck size={14} color="#10b981" />
          <span>Encrypted Session with JWT &amp; Role Check</span>
        </div>

        <div style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.88rem", color: "var(--text-secondary)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" style={{ color: "#38bdf8", fontWeight: 600, textDecoration: "none" }}>
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
