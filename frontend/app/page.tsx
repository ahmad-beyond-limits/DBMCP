"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("dbmcp_access_token");
    if (token) {
      setHasToken(true);
    }
  }, []);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "4rem 2rem" }}>
      {/* Hero Section */}
      <div style={{ textAlign: "center", marginBottom: "4rem" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.4rem 1rem",
          borderRadius: "9999px",
          background: "rgba(99, 102, 241, 0.12)",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          color: "#c7d2fe",
          fontSize: "0.85rem",
          fontWeight: 600,
          marginBottom: "1.5rem",
        }}>
          🛡️ Zero-Trust Model Context Protocol Gateway
        </div>

        <h1 style={{
          fontSize: "3.5rem",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.15,
          marginBottom: "1.5rem",
        }}>
          MCP is the access protocol.<br />
          <span style={{
            background: "var(--accent-gradient)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            The policy engine is the security boundary.
          </span>
        </h1>

        <p style={{
          fontSize: "1.2rem",
          color: "var(--text-secondary)",
          maxWidth: "750px",
          margin: "0 auto 2.5rem auto",
          lineHeight: 1.6,
        }}>
          Securely expose sensitive documents, PDFs, CSVs, and databases to AI models (Claude, Cursor, custom agents).
          Every request is authenticated, evaluated against field-level policies, transformed, and audited in real-time.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
          {hasToken ? (
            <Link href="/dashboard" className="btn-primary" style={{ padding: "0.9rem 2rem", fontSize: "1rem" }}>
              Go to Workspace Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/register" className="btn-primary" style={{ padding: "0.9rem 2rem", fontSize: "1rem" }}>
                Create Account
              </Link>
              <Link href="/login" className="btn-secondary" style={{ padding: "0.9rem 2rem", fontSize: "1rem" }}>
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Security Architecture Flow Visualizer */}
      <div className="glass-panel" style={{ padding: "2.5rem", marginBottom: "4rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem", textAlign: "center" }}>
          End-to-End Policy Enforcement Pipeline
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
          alignItems: "center",
          textAlign: "center",
        }}>
          {[
            { step: "1", title: "AI Model", desc: "Claude / Agent via MCP", color: "#818cf8" },
            { step: "2", title: "MCP Gateway", desc: "JSON-RPC 2.0 transport", color: "#a78bfa" },
            { step: "3", title: "High-Entropy Auth", desc: "Hashed token verification", color: "#f472b6" },
            { step: "4", title: "Workspace Isolation", desc: "Tenant context resolution", color: "#38bdf8" },
            { step: "5", title: "Policy Engine", desc: "Operation & resource rules", color: "#34d399" },
            { step: "6", title: "Anonymisation", desc: "Mask, redact, pseudonymize", color: "#fbbf24" },
            { step: "7", title: "Audit Log", desc: "Immutable security trail", color: "#10b981" },
          ].map((item, idx) => (
            <div key={idx} className="glass-card" style={{ padding: "1.2rem 0.8rem", position: "relative" }}>
              <div style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.08)",
                border: `1px solid ${item.color}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 0.75rem auto",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: item.color,
              }}>
                {item.step}
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem" }}>{item.title}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        <div className="glass-card">
          <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>🔒</div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>Zero Raw Storage Access</h3>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            No direct MCP access to Supabase Storage or PostgreSQL. Raw database URLs, credentials, and file paths are never exposed to AI models.
          </p>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>🎭</div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>Deterministic Pseudonymisation</h3>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Identical entities become consistent pseudonyms within a workspace (e.g. Person_001), while remaining entirely decoupled across workspaces.
          </p>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>📊</div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>Indirect Leakage Prevention</h3>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Restricting a field like &quot;salary&quot; strictly blocks queries, filters, and aggregations (AVG, MAX, MIN) referencing that column.
          </p>
        </div>
      </div>
    </div>
  );
}
