"use client";

import Link from "next/link";
import { useGateway } from "@/lib/GatewayContext";
import {
  Shield,
  Key,
  FileText,
  Lock,
  ArrowRight,
  ArrowUpRight,
  Terminal,
  Activity,
  CheckCircle2,
  Check,
  Table,
  Sparkles,
  Sliders,
  Database,
  Cpu,
} from "lucide-react";

export default function LandingPage() {
  const { checkAndNavigate } = useGateway();

  return (
    <div style={{
      maxWidth: "1160px",
      margin: "0 auto",
      padding: "clamp(2rem, 5vw, 3.5rem) clamp(1rem, 3vw, 1.5rem) clamp(4rem, 8vw, 6rem) clamp(1rem, 3vw, 1.5rem)",
    }}>
      {/* ========================================================================= */}
      {/* 1. HERO SECTION WITH AUTHENTIC SCIENTIFIC GRADIENT FEATURE SHOWCASE CARD  */}
      {/* ========================================================================= */}
      <section style={{
        borderRadius: "var(--radius-xl)",
        background: "var(--bg-surface)",
        border: "1px solid rgba(40, 40, 40, 0.04)",
        boxShadow: "var(--shadow-glass)",
        padding: "clamp(2.5rem, 5vw, 4rem) clamp(1.5rem, 4vw, 3.25rem)",
        marginBottom: "2rem",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
          gap: "clamp(2.5rem, 5vw, 3.5rem)",
          alignItems: "center",
        }}>
          {/* Left: Clean, Restrained Editorial Headline & CTA */}
          <div>
            <div className="slash-tag">POAIS GATEWAY</div>

            <h1 className="font-hero" style={{
              fontSize: "clamp(2.2rem, 4.5vw, 3.4rem)",
              lineHeight: 1.12,
              fontWeight: 400,
              color: "var(--text-primary)",
              marginBottom: "1.25rem",
              letterSpacing: "-0.04em",
            }}>
              Private Data Access for AI Agents, Safely.
            </h1>

            <p style={{
              fontSize: "clamp(0.95rem, 1.8vw, 1.05rem)",
              lineHeight: 1.6,
              color: "var(--text-secondary)",
              maxWidth: "460px",
              marginBottom: "2.25rem",
              fontWeight: 400,
            }}>
              POAIS (Policy-Oriented AI Space) securely connects AI assistants, autonomous agents, and LLM tools to your internal Excel tables, CSVs, and documents with deterministic data masking and forensic query logging.
            </p>

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
              <Link
                href="/register"
                className="pill-btn pill-btn-solid"
                style={{ padding: "0.85rem 1.75rem", fontSize: "0.92rem", textDecoration: "none" }}
              >
                <span>Get Started</span>
                <ArrowUpRight size={15} strokeWidth={1.5} />
              </Link>

              <Link
                href="/dashboard"
                className="pill-btn pill-btn-glass"
                style={{ padding: "0.85rem 1.5rem", fontSize: "0.92rem", textDecoration: "none" }}
              >
                <span>Open Workspaces</span>
              </Link>
            </div>
          </div>

          {/* Right: Authentic Scientific Gradient Feature Capsule */}
          <div>
            <div className="card-scientific-gradient" style={{
              padding: "clamp(1.75rem, 4vw, 2.25rem)",
              borderRadius: "var(--radius-xl)",
            }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem" }}>
                <div>
                  <div style={{
                    fontSize: "0.72rem",
                    fontWeight: 450,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "rgba(46, 48, 50, 0.7)",
                    marginBottom: "0.25rem",
                  }}>
                    POAIS GATEWAY ENGINE
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 400, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                    Policy Boundary Active
                  </div>
                </div>

                <div className="icon-circle-btn">
                  <ArrowUpRight size={16} strokeWidth={1.5} />
                </div>
              </div>

              {/* Elevated Clinical Capsule */}
              <div style={{
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(16px)",
                padding: "1.25rem",
                borderRadius: "var(--radius-lg)",
                border: "1px solid rgba(255, 255, 255, 0.8)",
                marginBottom: "1.5rem",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.4rem" }}>
                  <span style={{ fontSize: "0.76rem", color: "var(--text-secondary)" }}>Data Transformation</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.72rem", color: "var(--text-primary)", fontWeight: 500 }}>
                    Zero-Trust Safe
                  </span>
                </div>
                <div style={{
                  fontSize: "clamp(1.75rem, 3.5vw, 2.1rem)",
                  fontWeight: 400,
                  lineHeight: 1.1,
                  letterSpacing: "-0.04em",
                  color: "var(--text-primary)",
                  marginBottom: "0.6rem",
                }}>
                  Live Redaction
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                  <span className="badge-status" style={{ fontSize: "0.68rem", padding: "0.15rem 0.5rem" }}>
                    • PII Anonymized
                  </span>
                  <span className="badge-status" style={{ fontSize: "0.68rem", padding: "0.15rem 0.5rem" }}>
                    • Column Level Masking
                  </span>
                  <span className="badge-status" style={{ fontSize: "0.68rem", padding: "0.15rem 0.5rem" }}>
                    • AI Row Mutation
                  </span>
                </div>
              </div>

              {/* Live Status Indicators */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#2E3032" }} />
                  <span style={{ fontSize: "0.78rem", fontWeight: 450, color: "var(--text-primary)" }}>
                    MCP v2024-11-05 Protocol
                  </span>
                </div>

                <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)", fontFamily: "JetBrains Mono, monospace" }}>
                  SSE + Bearer Auth
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. RESTRAINED 3-COLUMN FEATURE CARDS                                      */}
      {/* ========================================================================= */}
      <section style={{ marginBottom: "2rem" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: "1.25rem",
        }}>
          {/* Feature 1 */}
          <div className="frosted-panel" style={{ padding: "clamp(1.75rem, 3.5vw, 2.25rem)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div className="icon-circle-btn">
                <Key size={18} strokeWidth={1.5} />
              </div>
              <span style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-tertiary)" }}>01</span>
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 400, marginBottom: "0.45rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Custom AI MCP Links
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6, fontWeight: 400 }}>
              Generate independent MCP links for each AI tool or colleague. Control which files each link can access and rotate tokens with one click.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="frosted-panel" style={{ padding: "clamp(1.75rem, 3.5vw, 2.25rem)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div className="icon-circle-btn">
                <Sliders size={18} strokeWidth={1.5} />
              </div>
              <span style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-tertiary)" }}>02</span>
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 400, marginBottom: "0.45rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Power Query Data Studio
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6, fontWeight: 400 }}>
              Upload Excel spreadsheets (.xlsx) and CSV files. Visually inspect columns, preview live masks, and drop confidential columns before sharing with AI.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="frosted-panel" style={{ padding: "clamp(1.75rem, 3.5vw, 2.25rem)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div className="icon-circle-btn">
                <Activity size={18} strokeWidth={1.5} />
              </div>
              <span style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-tertiary)" }}>03</span>
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 400, marginBottom: "0.45rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Forensic Activity Trail
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6, fontWeight: 400 }}>
              Every resource read, semantic search, dataset query, and AI row update is logged with exact timestamps and caller identity.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SOFT CLINICAL CALLOUT BANNER                                           */}
      {/* ========================================================================= */}
      <section style={{
        padding: "clamp(2.5rem, 5vw, 3.5rem) clamp(1.5rem, 4vw, 3rem)",
        borderRadius: "var(--radius-xl)",
        background: "#2E3032",
        color: "#FFFFFF",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1.75rem",
      }}>
        <div style={{ maxWidth: "560px" }}>
          <div style={{
            fontSize: "0.72rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "rgba(255, 255, 255, 0.6)",
            fontWeight: 450,
            marginBottom: "0.5rem",
          }}>
            READY IN SECONDS
          </div>
          <h2 style={{
            fontSize: "clamp(1.5rem, 3vw, 2.1rem)",
            fontWeight: 400,
            color: "#FFFFFF",
            marginBottom: "0.6rem",
            letterSpacing: "-0.03em",
          }}>
            Give your AI agents safe data access today.
          </h2>
          <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.92rem", lineHeight: 1.5, fontWeight: 400 }}>
            Create an isolated workspace, upload documents, and generate custom MCP links for your AI assistants and agents.
          </p>
        </div>

        <div>
          <Link
            href="/register"
            className="pill-btn"
            style={{
              background: "#FFFFFF",
              color: "#2E3032",
              fontWeight: 450,
              padding: "0.85rem 1.75rem",
              fontSize: "0.92rem",
              textDecoration: "none",
            }}
          >
            <span>Create Workspace</span>
            <ArrowRight size={15} strokeWidth={1.5} />
          </Link>
        </div>
      </section>
    </div>
  );
}
