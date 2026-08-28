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
          {/* Vibrant Open Geometric POAIS Insignia */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "0.85rem",
          }}>
            <svg width="42" height="42" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 3px 10px rgba(99, 102, 241, 0.3))" }}>
              <defs>
                <linearGradient id="poaisRegGrad1" x1="2" y1="2" x2="34" y2="34" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="45%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
                <linearGradient id="poaisRegGrad2" x1="34" y1="2" x2="2" y2="34" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#06B6D4" />
                  <stop offset="50%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
                <linearGradient id="poaisRegGlass" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="rgba(99, 102, 241, 0.12)" />
                  <stop offset="100%" stopColor="rgba(6, 182, 212, 0.06)" />
                </linearGradient>
              </defs>

              <rect x="2" y="2" width="32" height="32" rx="10" fill="url(#poaisRegGlass)" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="1" />
              <path
                d="M18 6.5L27.5 11V18.2C27.5 24 23.5 28.5 18 30.5C12.5 28.5 8.5 24 8.5 18.2V11L18 6.5Z"
                stroke="url(#poaisRegGrad1)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <ellipse cx="18" cy="18" rx="11" ry="4.5" transform="rotate(-32 18 18)" stroke="url(#poaisRegGrad2)" strokeWidth="1.8" strokeLinecap="round" />
              <ellipse cx="18" cy="18" rx="11" ry="4.5" transform="rotate(32 18 18)" stroke="url(#poaisRegGrad1)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="18 4" />
              <circle cx="18" cy="18" r="3.2" fill="url(#poaisRegGrad1)" />
              <circle cx="18" cy="18" r="1.4" fill="#FFFFFF" />
            </svg>
          </div>

          <h1 className="font-hero" style={{ fontSize: "1.85rem", fontWeight: 400, marginBottom: "0.3rem", color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
            Get Started with POAIS
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", fontWeight: 400 }}>
            Create your account to start managing AI data workspaces
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
