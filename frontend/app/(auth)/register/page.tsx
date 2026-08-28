"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      await api.register(username, password);
      router.push("/dashboard");
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("network")) {
        setError("Cloud server is waking up from idle state. Please wait 15-20 seconds and click Create Account again.");
      } else {
        setError(msg || "Registration failed");
      }
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
    }}>
      <div className="frosted-panel" style={{
        width: "100%",
        maxWidth: "440px",
        padding: "2.75rem 2.25rem",
        boxShadow: "var(--shadow-card)",
        borderRadius: "var(--radius-xl)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div className="slash-tag" style={{ justifyContent: "center" }}>
            CREATE ACCOUNT
          </div>
          <h1 className="font-editorial" style={{ fontSize: "1.85rem", marginBottom: "0.4rem" }}>
            Get Started
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
            Create your user profile and initialize your first workspace
          </p>
        </div>

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

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
              Username
            </label>
            <input
              type="text"
              required
              className="modern-input"
              placeholder="e.g. alex"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
              Password
            </label>
            <input
              type="password"
              required
              className="modern-input"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
              Confirm Password
            </label>
            <input
              type="password"
              required
              className="modern-input"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="pill-btn pill-btn-primary"
            style={{ width: "100%", padding: "0.8rem", marginTop: "0.5rem" }}
          >
            {loading ? "Creating..." : "Create Account"}
            <div className="btn-arrow-circle">
              <ArrowRight size={12} />
            </div>
          </button>
        </form>

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.4rem",
          marginTop: "1.75rem",
          fontSize: "0.78rem",
          color: "var(--text-muted)",
        }}>
          <ShieldCheck size={14} color="#059669" />
          <span>Bcrypt hashed credentials &amp; isolated schemas</span>
        </div>

        <div style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--text-primary)", fontWeight: 700, textDecoration: "underline" }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
