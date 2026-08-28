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
      try {
        await api.login(username, password);
        router.push("/dashboard");
      } catch (loginErr) {
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
      padding: "2rem 1rem",
    }}>
      <div className="frosted-panel" style={{
        width: "100%",
        maxWidth: "420px",
        padding: "clamp(2rem, 5vw, 2.75rem) clamp(1.5rem, 4vw, 2.25rem)",
        borderRadius: "var(--radius-xl)",
        background: "#FFFFFF",
        boxShadow: "var(--shadow-lg)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div className="slash-tag" style={{ justifyContent: "center" }}>
            CREATE ACCOUNT
          </div>
          <h1 className="font-hero" style={{ fontSize: "1.85rem", fontWeight: 400, marginBottom: "0.3rem", color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
            Get Started
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", fontWeight: 400 }}>
            Create your user profile and initialize your workspace
          </p>
        </div>

        {error && (
          <div style={{
            background: "var(--status-deny-bg)",
            border: "1px solid rgba(194, 65, 12, 0.15)",
            color: "var(--status-deny)",
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.85rem",
            marginBottom: "1.5rem",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "0.45rem", color: "var(--text-secondary)" }}>
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
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "0.45rem", color: "var(--text-secondary)" }}>
              Password
            </label>
            <input
              type="password"
              required
              className="modern-input"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "0.45rem", color: "var(--text-secondary)" }}>
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
            style={{ width: "100%", padding: "0.85rem", marginTop: "0.5rem" }}
          >
            {loading ? "Creating Account..." : "Create Account"}
            <ArrowRight size={14} strokeWidth={1.5} />
          </button>
        </form>

        <div style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--text-primary)", fontWeight: 500, textDecoration: "none" }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
