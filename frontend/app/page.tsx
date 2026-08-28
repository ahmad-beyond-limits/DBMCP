"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shield, Lock, Cpu, EyeOff, Database, Terminal, CheckCircle2, ArrowRight } from "lucide-react";

export default function HomePage() {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("dbmcp_access_token");
    if (token) {
      setHasToken(true);
    }
  }, []);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "4rem 2rem 6rem 2rem" }}>
      {/* Hero Section (Reference 1 Typography + Reference 2 Structure) */}
      <div style={{ textAlign: "center", marginBottom: "5rem" }}>
        <div className="slash-tag" style={{ justifyContent: "center" }}>
          ZERO-TRUST MODEL CONTEXT PROTOCOL GATEWAY
        </div>

        <h1 className="font-editorial" style={{
          fontSize: "clamp(2.8rem, 6vw, 5.2rem)",
          fontWeight: 800,
          lineHeight: 1.05,
          marginBottom: "1.75rem",
          letterSpacing: "-0.03em",
          color: "#f8fafc",
        }}>
          AI ACCESS. <span style={{
            background: "linear-gradient(135deg, #38bdf8 0%, #06b6d4 50%, #3b82f6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>ZERO EXPOSURE.</span>
        </h1>

        <p style={{
          fontSize: "1.25rem",
          color: "var(--text-secondary)",
          maxWidth: "760px",
          margin: "0 auto 2.5rem auto",
          lineHeight: 1.6,
          fontWeight: 400,
        }}>
          MCP is the access protocol. The workspace policy engine is the security boundary.
          Safely expose documents, PDF, DOCX, and structured datasets to AI models with deterministic anonymisation.
        </p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
          <Link href={hasToken ? "/dashboard" : "/register"} className="pill-btn pill-btn-primary">
            {hasToken ? "Open Workspace Console" : "Get Started Free"}
            <div className="btn-arrow-circle">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
          <a href="#architecture" className="pill-btn pill-btn-dark">
            Explore Architecture
          </a>
        </div>
      </div>

      {/* Browser Window Showcase with Interactive Callout Pins (Reference 1 & 2) */}
      <div className="browser-window" style={{ marginBottom: "6rem" }}>
        <div className="browser-header">
          <div className="browser-dots">
            <div className="browser-dot dot-red" />
            <div className="browser-dot dot-yellow" />
            <div className="browser-dot dot-green" />
          </div>
          <div className="browser-url-bar">
            <Lock size={12} color="#38bdf8" />
            <span>https://gateway.dbmcp.live/workspace/policy-engine</span>
          </div>
          <div className="browser-actions">
            <Terminal size={14} />
          </div>
        </div>

        {/* Browser Content Canvas with Callout Pins */}
        <div style={{
          padding: "4rem 2rem",
          minHeight: "480px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "radial-gradient(ellipse at center, rgba(14, 28, 54, 0.6) 0%, rgba(7, 10, 17, 0.95) 75%)",
          overflow: "hidden",
        }}>
          {/* Architectural Callout Pins (Reference 1 Signature Style) */}
          <div className="callout-pin" style={{ top: "35px", left: "6%" }}>
            <span className="pin-icon-circle">+</span>
            <span>Zero Direct DB Access</span>
          </div>

          <div className="callout-pin" style={{ top: "45px", right: "7%", animationDelay: "1s" }}>
            <span className="pin-icon-circle">+</span>
            <span>Deterministic Keyed Pseudonyms</span>
          </div>

          <div className="callout-pin" style={{ bottom: "40px", left: "8%", animationDelay: "2s" }}>
            <span className="pin-icon-circle">+</span>
            <span>Precedence: Deny &gt; Allow</span>
          </div>

          <div className="callout-pin" style={{ bottom: "45px", right: "6%", animationDelay: "1.5s" }}>
            <span className="pin-icon-circle">+</span>
            <span>Indirect Leakage Guard</span>
          </div>

          {/* Central Security Pipeline Node */}
          <div style={{
            maxWidth: "780px",
            width: "100%",
            zIndex: 5,
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1.25rem",
              alignItems: "stretch",
            }}>
              {/* Box 1: AI Model Client */}
              <div className="frosted-panel" style={{ padding: "1.75rem 1.5rem", textAlign: "center" }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "rgba(56, 189, 248, 0.12)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem auto",
                  color: "#38bdf8",
                }}>
                  <Cpu size={24} />
                </div>
                <h3 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>AI Model Client</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  Claude, Cursor, or Agent sending JSON-RPC 2.0 requests with private Bearer token.
                </p>
              </div>

              {/* Box 2: DBMCP Policy Engine */}
              <div className="frosted-panel frosted-panel-highlight" style={{
                padding: "1.75rem 1.5rem",
                textAlign: "center",
                boxShadow: "0 0 35px rgba(56, 189, 248, 0.25)",
              }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem auto",
                  color: "#ffffff",
                  boxShadow: "0 0 16px rgba(6, 182, 212, 0.4)",
                }}>
                  <Shield size={24} />
                </div>
                <h3 style={{ fontSize: "1.05rem", marginBottom: "0.4rem", color: "#38bdf8" }}>Policy Security Boundary</h3>
                <p style={{ fontSize: "0.8rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                  Evaluates operation policies, masks PII, and strips unauthorized columns before delivery.
                </p>
              </div>

              {/* Box 3: Enterprise Data Sources */}
              <div className="frosted-panel" style={{ padding: "1.75rem 1.5rem", textAlign: "center" }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem auto",
                  color: "#10b981",
                }}>
                  <Database size={24} />
                </div>
                <h3 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>Isolated Data Sources</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  PostgreSQL, Supabase Storage, and local files completely shielded from direct network access.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editorial Slash Section (Reference 2) */}
      <div id="architecture" style={{ marginBottom: "6rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "3rem", flexWrap: "wrap", gap: "1.5rem" }}>
          <div>
            <div className="slash-tag">WHY CHOOSE DBMCP</div>
            <h2 className="font-editorial" style={{ fontSize: "clamp(2rem, 3.5vw, 3rem)", maxWidth: "600px", lineHeight: 1.15 }}>
              We specialize in providing reliable, policy-enforced AI access
            </h2>
          </div>
          <p style={{ color: "var(--text-secondary)", maxWidth: "480px", fontSize: "0.95rem", lineHeight: 1.6 }}>
            Whether you need to expose enterprise PDFs, clinical trial records, or financial tables, our gateway ensures compliance and zero credential leakage.
          </p>
        </div>

        {/* 4-Card Capability Grid with Circular Badges */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1.5rem",
        }}>
          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.5rem",
              color: "#38bdf8",
            }}>
              <Lock size={20} />
            </div>
            <h3 style={{ fontSize: "1.15rem", marginBottom: "0.75rem" }}>No Direct DB Credentials</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              AI agents never see database connection strings or raw storage URLs. All interactions occur strictly through verified MCP tools.
            </p>
          </div>

          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.5rem",
              color: "#10b981",
            }}>
              <EyeOff size={20} />
            </div>
            <h3 style={{ fontSize: "1.15rem", marginBottom: "0.75rem" }}>Keyed Pseudonymisation</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Entities are salted and consistently pseudonymized across conversations within a workspace, while completely decoupled between tenants.
            </p>
          </div>

          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.5rem",
              color: "#818cf8",
            }}>
              <Shield size={20} />
            </div>
            <h3 style={{ fontSize: "1.15rem", marginBottom: "0.75rem" }}>Indirect Leakage Guard</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              When a column is denied, aggregation queries like AVG(salary) or WHERE filters targeting that field are automatically rejected.
            </p>
          </div>

          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.5rem",
              color: "#fbbf24",
            }}>
              <CheckCircle2 size={20} />
            </div>
            <h3 style={{ fontSize: "1.15rem", marginBottom: "0.75rem" }}>Sanitized Audit Trail</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Every access attempt, policy evaluation, and transformation is immutably logged with secrets and raw document contents stripped.
            </p>
          </div>
        </div>
      </div>

      {/* Step-by-Step Enforcement Flow (Reference 3 Numbered Steps) */}
      <div style={{
        padding: "3.5rem 3rem",
        background: "linear-gradient(145deg, rgba(14, 22, 40, 0.8) 0%, rgba(8, 12, 22, 0.9) 100%)",
        border: "1px solid rgba(56, 189, 248, 0.2)",
        borderRadius: "var(--radius-xl)",
        backdropFilter: "blur(20px)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div className="slash-tag" style={{ justifyContent: "center" }}>STEP-BY-STEP ENFORCEMENT</div>
          <h2 className="font-editorial" style={{ fontSize: "2.4rem" }}>How DBMCP Shields Your Data</h2>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "2rem",
        }}>
          <div style={{ position: "relative" }}>
            <div className="step-number" style={{ marginBottom: "0.75rem" }}>01</div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Token Authentication</h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              AI connects using high-entropy bearer token (mcp_live_...). Workspace identity is derived internally; client-supplied IDs are never trusted.
            </p>
          </div>

          <div style={{ position: "relative" }}>
            <div className="step-number" style={{ marginBottom: "0.75rem" }}>02</div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Policy Precedence Check</h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Operation rules and resource access are evaluated. Explicit DENY immediately halts the request and logs a security denial event.
            </p>
          </div>

          <div style={{ position: "relative" }}>
            <div className="step-number" style={{ marginBottom: "0.75rem" }}>03</div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Read-Time Transformation</h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Permitted content passes through PII masking, redaction, or keyed pseudonymisation before the filtered response reaches the AI model.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
