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
  Sparkles,
  Terminal,
  Activity,
  CheckCircle2,
  Database,
  Cpu,
  Layers,
} from "lucide-react";

export default function LandingPage() {
  const { checkAndNavigate } = useGateway();

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "3rem 2rem 6rem 2rem" }}>
      {/* ========================================================================= */}
      {/* 1. HERO SECTION (Swiss Editorial Style from Reference Image 1) */}
      {/* ========================================================================= */}
      <section style={{ marginBottom: "4.5rem" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "2.5rem",
          alignItems: "flex-end",
          marginBottom: "3rem",
        }}>
          <div>
            <div className="slash-tag">ZERO-TRUST MCP DATA GATEWAY</div>
            <h1 className="font-editorial" style={{
              fontSize: "clamp(2.4rem, 5vw, 4rem)",
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: "-0.035em",
              color: "#0f172a",
            }}>
              Bridge Your Enterprise Data to AI Agents Securely
            </h1>
          </div>

          <div style={{ maxWidth: "480px" }}>
            <p style={{
              fontSize: "1.05rem",
              lineHeight: 1.6,
              color: "var(--text-secondary)",
              marginBottom: "1.75rem",
            }}>
              Connect Claude, Cursor, and custom LLMs to PDFs, CSVs, and internal documents with granular access policies, real-time PII anonymisation, and cryptographic audit trails.
            </p>

            <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap" }}>
              <button
                onClick={() => checkAndNavigate("/register")}
                className="pill-btn pill-btn-primary"
                style={{ padding: "0.75rem 1.6rem", fontSize: "0.95rem" }}
              >
                Create Free Workspace
                <div className="btn-arrow-circle">
                  <ArrowRight size={12} />
                </div>
              </button>

              <button
                onClick={() => checkAndNavigate("/dashboard")}
                className="pill-btn pill-btn-dark"
                style={{ padding: "0.75rem 1.4rem", fontSize: "0.95rem" }}
              >
                Open Console
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. RADIANT GLASS PREVIEW CANVAS (Fintech/Glass Cards from Images 2, 3, 4) */}
        {/* ========================================================================= */}
        <div className="browser-window" style={{ padding: "1.75rem", background: "#f8fafc" }}>
          <div className="browser-header" style={{ marginBottom: "1.5rem", borderRadius: "var(--radius-sm)" }}>
            <div className="browser-dots">
              <div className="browser-dot dot-red" />
              <div className="browser-dot dot-yellow" />
              <div className="browser-dot dot-green" />
            </div>
            <div className="browser-address-bar">
              🔒 https://gateway.dbmcp.io/workspaces/enterprise-vault/mcp
            </div>
          </div>

          {/* Grid of Radiant Glass Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
          }}>
            {/* Card 1: Lime Glass (Active Documents & Protection) */}
            <div className="glass-card-lime">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <FileText size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.8, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                      DOCUMENTS VAULT
                    </div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>Financial &amp; Customer Records</div>
                  </div>
                </div>

                <div className="circle-action-btn circle-action-btn-light">
                  <ArrowUpRight size={16} />
                </div>
              </div>

              <div>
                <div style={{ fontSize: "0.8rem", opacity: 0.85, marginBottom: "0.2rem" }}>Active Encrypted Files</div>
                <div className="font-editorial" style={{ fontSize: "2.4rem", fontWeight: 800, lineHeight: 1, marginBottom: "1.25rem" }}>
                  14 Files
                </div>

                {/* Timeline / scanning dots */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.75rem", borderTop: "1px solid rgba(255, 255, 255, 0.2)" }}>
                  <div className="dots-meter">
                    <div className="dots-meter-dot active" />
                    <div className="dots-meter-dot active" />
                    <div className="dots-meter-dot active" />
                    <div className="dots-meter-dot" />
                    <div className="dots-meter-dot" />
                  </div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, opacity: 0.9 }}>
                    PII Masking Active
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Amber Glass (Live MCP Connections) */}
            <div className="glass-card-amber">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Key size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.8, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                      AI AGENT BRIDGES
                    </div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>Claude &amp; Cursor Connectors</div>
                  </div>
                </div>

                <div className="circle-action-btn circle-action-btn-light">
                  <ArrowUpRight size={16} />
                </div>
              </div>

              <div>
                <div style={{ fontSize: "0.8rem", opacity: 0.85, marginBottom: "0.2rem" }}>Total Queries Streamed</div>
                <div className="font-editorial" style={{ fontSize: "2.4rem", fontWeight: 800, lineHeight: 1, marginBottom: "1.25rem" }}>
                  56,420
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.75rem", borderTop: "1px solid rgba(255, 255, 255, 0.2)" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                    Protocol: JSON-RPC 2.0
                  </div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, opacity: 0.9 }}>
                    0 Policy Violations
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Dark Obsidian Glass (Policy Engine) */}
            <div className="glass-card-dark">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Shield size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.7, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                      ZERO-TRUST POLICY
                    </div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>Dynamic Anonymisation</div>
                  </div>
                </div>

                <div className="circle-action-btn circle-action-btn-light">
                  <ArrowUpRight size={16} />
                </div>
              </div>

              <div>
                <div style={{ fontSize: "0.8rem", opacity: 0.75, marginBottom: "0.2rem" }}>Real-time Leakage Prevention</div>
                <div className="font-editorial" style={{ fontSize: "2.4rem", fontWeight: 800, lineHeight: 1, marginBottom: "1.25rem" }}>
                  100% Pass
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.75rem", borderTop: "1px solid rgba(255, 255, 255, 0.15)" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#a7f3d0" }}>
                    AES-256-GCM
                  </div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, opacity: 0.8 }}>
                    Immutable Audit Log
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. FOUR PILLARS SECTION (Swiss Grid Layout from Reference Image 1) */}
      {/* ========================================================================= */}
      <section style={{
        paddingTop: "3rem",
        borderTop: "1px solid var(--border-card)",
        marginBottom: "4.5rem",
      }}>
        <div style={{ marginBottom: "2.5rem" }}>
          <div className="slash-tag">CORE CAPABILITIES</div>
          <h2 className="font-editorial" style={{ fontSize: "2rem", letterSpacing: "-0.02em" }}>
            Engineered for Strict Enterprise Privacy
          </h2>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "2rem",
        }}>
          {[
            {
              num: "01",
              title: "Multi-Link MCP Sharing",
              desc: "Create multiple distinct MCP links for different AI models. Each link has its own file access permissions and data privacy policies.",
              icon: <Key size={20} color="#2563eb" />,
            },
            {
              num: "02",
              title: "Real-Time Data Masking",
              desc: "Automatically detect and mask emails, person names, and SSNs. Remove or transform sensitive dataset columns before the AI receives results.",
              icon: <Shield size={20} color="#059669" />,
            },
            {
              num: "03",
              title: "Forensic Audit Trail",
              desc: "Every resource read, semantic search, and dataset query is permanently logged with timestamps, caller identity, and policy decisions.",
              icon: <Activity size={20} color="#d97706" />,
            },
            {
              num: "04",
              title: "Native MCP Protocol",
              desc: "Full standard JSON-RPC 2.0 compatibility for Claude Desktop, Cursor, and custom MCP clients over Streamable HTTP and SSE.",
              icon: <Terminal size={20} color="#0f172a" />,
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="frosted-panel"
              style={{
                padding: "2rem 1.75rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {feature.icon}
                  </div>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem", color: "var(--text-dim)", fontWeight: 700 }}>
                    /{feature.num}
                  </span>
                </div>

                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.6rem" }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. CALL TO ACTION BANNER */}
      {/* ========================================================================= */}
      <section className="glass-card-dark" style={{
        padding: "3.5rem clamp(2rem, 5vw, 4rem)",
        borderRadius: "var(--radius-xl)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "2rem",
      }}>
        <div style={{ maxWidth: "600px" }}>
          <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#60a5fa", fontWeight: 700, marginBottom: "0.5rem" }}>
            GET STARTED IN SECONDS
          </div>
          <h2 className="font-editorial" style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)", color: "#ffffff", marginBottom: "0.75rem" }}>
            Ready to give your AI agents safe data access?
          </h2>
          <p style={{ color: "rgba(255, 255, 255, 0.75)", fontSize: "0.95rem", lineHeight: 1.5 }}>
            Create an isolated workspace, upload documents, and generate custom MCP links for Claude or Cursor in under 60 seconds.
          </p>
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={() => checkAndNavigate("/register")}
            className="pill-btn pill-btn-blue"
            style={{ padding: "0.85rem 1.75rem", fontSize: "0.95rem" }}
          >
            Create Free Account
            <ArrowRight size={14} />
          </button>
        </div>
      </section>
    </div>
  );
}
