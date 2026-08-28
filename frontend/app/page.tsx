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
    <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "clamp(1.5rem, 4vw, 3rem) clamp(1rem, 3vw, 1.5rem) clamp(3rem, 6vw, 6rem) clamp(1rem, 3vw, 1.5rem)" }}>
      {/* ========================================================================= */}
      {/* 1. HERO BANNER WITH TD BANK STYLE RADIANT GLASS CARD                      */}
      {/* ========================================================================= */}
      <section style={{
        position: "relative",
        borderRadius: "var(--radius-xl)",
        overflow: "hidden",
        padding: "clamp(2rem, 5vw, 3.5rem) clamp(1.25rem, 4vw, 3rem)",
        background: "rgba(255, 255, 255, 0.75)",
        backdropFilter: "blur(36px) saturate(180%)",
        WebkitBackdropFilter: "blur(36px) saturate(180%)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-glass)",
        marginBottom: "2.5rem",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: "clamp(2rem, 4vw, 3rem)",
          alignItems: "center",
        }}>
          {/* Headline & CTA */}
          <div>
            <div className="slash-tag">POLICY-ENFORCED AI DATA WORKSPACE</div>

            <h1 className="font-hero" style={{
              fontSize: "clamp(2rem, 4.5vw, 3.4rem)",
              lineHeight: 1.15,
              fontWeight: 600,
              color: "var(--color-obsidian)",
              marginBottom: "1.25rem",
            }}>
              The Power of Enterprise Data in Every AI Agent
            </h1>

            <p style={{
              fontSize: "clamp(0.92rem, 1.8vw, 1rem)",
              lineHeight: 1.6,
              color: "var(--text-secondary)",
              maxWidth: "460px",
              marginBottom: "2rem",
            }}>
              Connect Claude, Cursor, and custom LLMs to your private files with granular access control, automated PII masking, and full auditability.
            </p>

            <div style={{ display: "flex", gap: "0.85rem", alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => checkAndNavigate("/register")}
                className="pill-btn pill-btn-solid"
                style={{ padding: "0.75rem 1.6rem" }}
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
          <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <div className="glass-card-radiant" style={{
              width: "100%",
              maxWidth: "380px",
              padding: "clamp(1.5rem, 3vw, 2rem)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.08em", color: "#d9f99d" }}>
                      DBMCP GATEWAY VAULT
                    </span>
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#a3e635" }} />
                  </div>
                  <div style={{ fontSize: "1.15rem", fontWeight: 600, color: "#ffffff" }}>
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
                padding: "1.15rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                marginBottom: "1.5rem",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.4rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>Protected Documents</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.72rem", color: "#a3e635", fontWeight: 600 }}>
                    AES-256-GCM
                  </span>
                </div>
                <div style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.2rem)", fontWeight: 700, lineHeight: 1, color: "#ffffff" }}>
                  14 Files Active
                </div>
              </div>

              {/* Progress & Micro-dots Timeline */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
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

                <span style={{ fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace", color: "rgba(255, 255, 255, 0.7)" }}>
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
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: "1.5rem",
        }}>
          {/* Feature 1 */}
          <div className="frosted-panel" style={{ padding: "clamp(1.5rem, 3vw, 2rem)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div style={{
                width: "38px",
                height: "38px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(132, 204, 22, 0.12)",
                border: "1px solid rgba(132, 204, 22, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-lime)",
              }}>
                <Key size={17} />
              </div>
              <span style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-muted)" }}>01</span>
            </div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: "0.4rem", color: "var(--color-obsidian)" }}>
              Multi-Link MCP Sharing
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Create multiple distinct MCP links for different AI models. Each link has its own file access permissions and data privacy policies.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="frosted-panel" style={{ padding: "clamp(1.5rem, 3vw, 2rem)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div style={{
                width: "38px",
                height: "38px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(132, 204, 22, 0.12)",
                border: "1px solid rgba(132, 204, 22, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-lime)",
              }}>
                <Shield size={17} />
              </div>
              <span style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-muted)" }}>02</span>
            </div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: "0.4rem", color: "var(--color-obsidian)" }}>
              Real-Time Data Masking
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Automatically detect and mask emails, names, and SSNs. Remove or transform sensitive dataset columns before the AI receives results.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="frosted-panel" style={{ padding: "clamp(1.5rem, 3vw, 2rem)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div style={{
                width: "38px",
                height: "38px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(132, 204, 22, 0.12)",
                border: "1px solid rgba(132, 204, 22, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-lime)",
              }}>
                <Activity size={17} />
              </div>
              <span style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-muted)" }}>03</span>
            </div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: "0.4rem", color: "var(--color-obsidian)" }}>
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
        padding: "clamp(2rem, 4vw, 3rem) clamp(1.25rem, 4vw, 3rem)",
        borderRadius: "var(--radius-xl)",
        background: "var(--color-obsidian)",
        color: "#ffffff",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1.75rem",
      }}>
        <div style={{ maxWidth: "560px" }}>
          <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#a3e635", fontWeight: 600, marginBottom: "0.4rem" }}>
            INSTANT CLOUD SETUP
          </div>
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.1rem)", fontWeight: 600, color: "#ffffff", marginBottom: "0.6rem" }}>
            Ready to give your AI agents safe data access?
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.5 }}>
            Create an isolated workspace, upload documents, and generate custom MCP links for Claude or Cursor in under 60 seconds.
          </p>
        </div>

        <div>
          <button
            onClick={() => checkAndNavigate("/register")}
            className="pill-btn"
            style={{ background: "#ffffff", color: "var(--color-obsidian)", fontWeight: 600, padding: "0.75rem 1.6rem" }}
          >
            <span>Create Free Workspace</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}
