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
      // Automatically log the user in so they have an active session token
      try {
        await api.login(username, password);
        router.push("/dashboard");
      } catch (loginErr) {
        // Fallback: take user to sign in page if auto-login had an issue
        router.push("/login?registered=true");
      }
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
        maxWidth: "420px",
        padding: "2.75rem 2.25rem",
        boxShadow: "var(--shadow-lg)",
        borderRadius: "var(--radius-xl)",
        background: "#ffffff",
      }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div className="slash-tag" style={{ justifyContent: "center" }}>
            CREATE ACCOUNT
          </div>
          <h1 className="font-hero" style={{ fontSize: "1.85rem", marginBottom: "0.3rem", color: "#0f172a" }}>
            Get Started
          </h1>
          <p style={{ fontSize: "0.88rem", color: "#64748b" }}>
            Create your user profile and initialize your first workspace
          </p>
        </div>

        {error && (
          <div style={{
            background: "var(--status-deny-bg)",
            border: "1px solid var(--status-deny-border)",
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
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.02em", textTransform: "uppercase", marginBottom: "0.45rem", color: "#475569" }}>
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
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.02em", textTransform: "uppercase", marginBottom: "0.45rem", color: "#475569" }}>
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
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.02em", textTransform: "uppercase", marginBottom: "0.45rem", color: "#475569" }}>
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
            className="pill-btn pill-btn-solid"
            style={{ width: "100%", padding: "0.8rem", marginTop: "0.5rem" }}
          >
            {loading ? "Creating Account..." : "Create Account"}
            <ArrowRight size={13} />
          </button>
        </form>

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.4rem",
          marginTop: "1.75rem",
          fontSize: "0.78rem",
          color: "#64748b",
        }}>
          <ShieldCheck size={14} color="#16a34a" />
          <span>Zero-Trust Workspace Vault</span>
        </div>

        <div style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.85rem", color: "#64748b" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#0f172a", fontWeight: 600, textDecoration: "underline" }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
