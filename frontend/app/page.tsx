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
} from "lucide-react";

export default function LandingPage() {
  const { checkAndNavigate } = useGateway();

  return (
    <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "3rem 1.5rem 6rem 1.5rem" }}>
      {/* ========================================================================= */}
      {/* 1. HERO BANNER WITH TD BANK STYLE RADIANT GLASS CARD                      */}
      {/* ========================================================================= */}
      <section style={{
        position: "relative",
        borderRadius: "var(--radius-xl)",
        overflow: "hidden",
        padding: "clamp(2.5rem, 5vw, 4rem) clamp(1.5rem, 4vw, 3.5rem)",
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(36px) saturate(180%)",
        WebkitBackdropFilter: "blur(36px) saturate(180%)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-glass)",
        marginBottom: "2.5rem",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "3rem",
          alignItems: "center",
        }}>
          {/* Headline & CTA */}
          <div>
            <div className="slash-tag">POLICY-ENFORCED AI DATA WORKSPACE</div>

            <h1 className="font-hero" style={{
              fontSize: "clamp(2.4rem, 4.5vw, 3.6rem)",
              lineHeight: 1.12,
              fontWeight: 600,
              color: "var(--color-obsidian)",
              marginBottom: "1.25rem",
            }}>
              The Power of Enterprise Data in Every AI Agent
            </h1>

            <p style={{
              fontSize: "1rem",
              lineHeight: 1.6,
              color: "var(--text-secondary)",
              maxWidth: "460px",
              marginBottom: "2rem",
            }}>
              Connect Claude, Cursor, and custom LLMs to your private files with granular access control, automated PII masking, and full auditability.
            </p>

            <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => checkAndNavigate("/register")}
                className="pill-btn pill-btn-solid"
                style={{ padding: "0.75rem 1.8rem" }}
              >
                <span>Explore Now</span>
                <ArrowUpRight size={15} />
              </button>

              <button
                onClick={() => checkAndNavigate("/dashboard")}
                className="pill-btn pill-btn-glass"
                style={{ padding: "0.75rem 1.4rem" }}
              >
                Open Console
              </button>
            </div>
          </div>

          {/* Right: The Exact TD Bank Style Radiant Card from Reference */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div className="glass-card-radiant" style={{
              width: "100%",
              maxWidth: "380px",
              padding: "2rem",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.08em", color: "#d9f99d" }}>
                      DBMCP GATEWAY VAULT
                    </span>
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#a3e635" }} />
                  </div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "#ffffff" }}>
                    Active Workspace
                  </div>
                </div>

                <div className="circle-action-btn circle-action-btn-dark">
                  <ArrowUpRight size={15} />
                </div>
              </div>

              {/* Contained Stat Capsule */}
              <div style={{
                background: "rgba(0, 0, 0, 0.25)",
                backdropFilter: "blur(16px)",
                padding: "1.25rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                marginBottom: "1.5rem",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.4rem" }}>
                  <span style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>Protected Documents</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem", color: "#a3e635", fontWeight: 600 }}>
                    AES-256-GCM
                  </span>
                </div>
                <div style={{ fontSize: "2.2rem", fontWeight: 700, lineHeight: 1, color: "#ffffff" }}>
                  14 Files Active
                </div>
              </div>

              {/* Progress & Micro-dots Timeline */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div className="dots-meter">
                    <div className="dots-meter-dot active" />
                    <div className="dots-meter-dot active" />
                    <div className="dots-meter-dot active" />
                    <div className="dots-meter-dot active" />
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#d9f99d" }}>
                    99.8% PII Masked
                  </span>
                </div>

                <span style={{ fontSize: "0.72rem", fontFamily: "JetBrains Mono, monospace", color: "rgba(255, 255, 255, 0.7)" }}>
                  MCP v2024-11-05
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. THREE CONSISTENT FROSTED GLASS FEATURE CARDS                           */}
      {/* ========================================================================= */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.5rem",
        }}>
          {/* Feature 1 */}
          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(132, 204, 22, 0.12)",
                border: "1px solid rgba(132, 204, 22, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-lime)",
              }}>
                <Key size={18} />
              </div>
              <span style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-muted)" }}>01</span>
            </div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--color-obsidian)" }}>
              Multi-Link MCP Sharing
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Create multiple distinct MCP links for different AI models. Each link has its own file access permissions and data privacy policies.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(132, 204, 22, 0.12)",
                border: "1px solid rgba(132, 204, 22, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-lime)",
              }}>
                <Shield size={18} />
              </div>
              <span style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-muted)" }}>02</span>
            </div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--color-obsidian)" }}>
              Real-Time Data Masking
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Automatically detect and mask emails, names, and SSNs. Remove or transform sensitive dataset columns before the AI receives results.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(132, 204, 22, 0.12)",
                border: "1px solid rgba(132, 204, 22, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-lime)",
              }}>
                <Activity size={18} />
              </div>
              <span style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-muted)" }}>03</span>
            </div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--color-obsidian)" }}>
              Forensic Audit Trail
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Every resource read, semantic search, and dataset query is permanently logged with timestamps, caller identity, and policy decisions.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CLEAN OBSIDIAN CTA CARD                                                */}
      {/* ========================================================================= */}
      <section style={{
        padding: "3rem clamp(1.5rem, 4vw, 3.5rem)",
        borderRadius: "var(--radius-xl)",
        background: "var(--color-obsidian)",
        color: "#ffffff",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "2rem",
      }}>
        <div style={{ maxWidth: "560px" }}>
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#a3e635", fontWeight: 600, marginBottom: "0.4rem" }}>
            INSTANT CLOUD SETUP
          </div>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 600, color: "#ffffff", marginBottom: "0.6rem" }}>
            Ready to give your AI agents safe data access?
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "0.92rem", lineHeight: 1.5 }}>
            Create an isolated workspace, upload documents, and generate custom MCP links for Claude or Cursor in under 60 seconds.
          </p>
        </div>

        <div>
          <button
            onClick={() => checkAndNavigate("/register")}
            className="pill-btn"
            style={{ background: "#ffffff", color: "var(--color-obsidian)", fontWeight: 600, padding: "0.8rem 1.8rem" }}
          >
            <span>Create Free Workspace</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}
