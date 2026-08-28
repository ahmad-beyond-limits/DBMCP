"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useGateway } from "@/lib/GatewayContext";
import { Lock, Cpu, EyeOff, Database, Terminal, CheckCircle2, Shield, ArrowRight } from "lucide-react";

export default function HomePage() {
  const [hasToken, setHasToken] = useState(false);
  const { checkAndNavigate } = useGateway();

  useEffect(() => {
    const token = localStorage.getItem("dbmcp_access_token");
    if (token) {
      setHasToken(true);
    }
  }, []);

  return (
    <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "4.5rem 2rem 6rem 2rem" }}>
      {/* Hero Section */}
      <div style={{ textAlign: "center", marginBottom: "4.5rem" }}>
        <div className="slash-tag" style={{ justifyContent: "center" }}>
          MODEL CONTEXT PROTOCOL GATEWAY
        </div>

        <h1 className="font-editorial" style={{
          fontSize: "clamp(2.5rem, 5.5vw, 4.4rem)",
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: "1.5rem",
          letterSpacing: "-0.03em",
          color: "#0f172a",
        }}>
          Secure Data Access for AI Agents.
        </h1>

        <p style={{
          fontSize: "1.2rem",
          color: "var(--text-secondary)",
          maxWidth: "720px",
          margin: "0 auto 2.25rem auto",
          lineHeight: 1.6,
          fontWeight: 400,
        }}>
          Connect documents, PDFs, and structured tables to Claude, Cursor, and LLM tools.
          Enforce field-level policies, PII masking, and immutable audit logs before data leaves your perimeter.
        </p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.85rem", flexWrap: "wrap" }}>
          <button
            onClick={() => checkAndNavigate(hasToken ? "/dashboard" : "/register")}
            className="pill-btn pill-btn-primary"
          >
            {hasToken ? "Open Workspace Console" : "Start Building Free"}
            <div className="btn-arrow-circle">
              <ArrowRight size={12} />
            </div>
          </button>
          <a href="#how-it-works" className="pill-btn pill-btn-dark">
            How It Works
          </a>
        </div>
      </div>

      {/* macOS Browser Mockup Showcase with Interactive Callouts */}
      <div className="browser-window" style={{ marginBottom: "6rem" }}>
        <div className="browser-header">
          <div className="browser-dots">
            <div className="browser-dot dot-red" />
            <div className="browser-dot dot-yellow" />
            <div className="browser-dot dot-green" />
          </div>
          <div className="browser-url-bar">
            <Lock size={12} color="#2563eb" />
            <span>https://api.dbmcp.com/v1/mcp</span>
          </div>
          <div className="browser-actions">
            <Terminal size={14} />
          </div>
        </div>

        {/* Content Canvas */}
        <div style={{
          padding: "4rem 2rem",
          minHeight: "440px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
          overflow: "hidden",
        }}>
          {/* Minimalist Callout Pins */}
          <div className="callout-pin" style={{ top: "30px", left: "6%" }}>
            <span className="pin-icon-circle">+</span>
            <span>No Direct Database Credentials</span>
          </div>

          <div className="callout-pin" style={{ top: "35px", right: "7%", animationDelay: "1s" }}>
            <span className="pin-icon-circle">+</span>
            <span>Deterministic Salted Pseudonyms</span>
          </div>

          <div className="callout-pin" style={{ bottom: "35px", left: "8%", animationDelay: "2s" }}>
            <span className="pin-icon-circle">+</span>
            <span>Precedence: Deny Overrides Allow</span>
          </div>

          <div className="callout-pin" style={{ bottom: "40px", right: "6%", animationDelay: "1.5s" }}>
            <span className="pin-icon-circle">+</span>
            <span>Indirect Leakage Prevention</span>
          </div>

          {/* Central Security Pipeline */}
          <div style={{ maxWidth: "780px", width: "100%", zIndex: 5 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1.25rem",
            }}>
              {/* Box 1: AI Model Client */}
              <div className="frosted-panel" style={{ padding: "1.75rem 1.5rem", textAlign: "center" }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem auto",
                  color: "#0f172a",
                }}>
                  <Cpu size={22} />
                </div>
                <h3 style={{ fontSize: "1.05rem", marginBottom: "0.35rem" }}>1. AI Client Request</h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  Claude, Cursor, or agent sends JSON-RPC tool calls using a private bearer token.
                </p>
              </div>

              {/* Box 2: Policy Security Engine */}
              <div className="frosted-panel frosted-panel-highlight" style={{
                padding: "1.75rem 1.5rem",
                textAlign: "center",
                border: "2px solid #2563eb",
              }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem auto",
                  color: "#ffffff",
                }}>
                  <Shield size={22} />
                </div>
                <h3 style={{ fontSize: "1.05rem", marginBottom: "0.35rem", color: "#2563eb" }}>2. Policy Evaluation</h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  Validates permissions, verifies column access, and executes PII masking.
                </p>
              </div>

              {/* Box 3: Enterprise Data Sources */}
              <div className="frosted-panel" style={{ padding: "1.75rem 1.5rem", textAlign: "center" }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem auto",
                  color: "#0f172a",
                }}>
                  <Database size={22} />
                </div>
                <h3 style={{ fontSize: "1.05rem", marginBottom: "0.35rem" }}>3. Filtered Delivery</h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  Only authorized, transformed data is returned. Denials return clear errors.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Capabilities Section */}
      <div id="how-it-works" style={{ marginBottom: "6rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "3rem", flexWrap: "wrap", gap: "1.5rem" }}>
          <div>
            <div className="slash-tag">CORE CAPABILITIES</div>
            <h2 className="font-editorial" style={{ fontSize: "clamp(1.8rem, 3.2vw, 2.6rem)", maxWidth: "580px", lineHeight: 1.2 }}>
              Everything needed to deploy AI agents safely on enterprise data
            </h2>
          </div>
          <p style={{ color: "var(--text-secondary)", maxWidth: "460px", fontSize: "0.95rem", lineHeight: 1.6 }}>
            Designed for data privacy officers and engineers who need AI productivity without data leakage.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1.5rem",
        }}>
          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.25rem",
              color: "#0f172a",
            }}>
              <Lock size={18} />
            </div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Zero Credential Sharing</h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              AI models never receive PostgreSQL connection strings or direct storage keys. All operations are mediated through authenticated MCP tools.
            </p>
          </div>

          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.25rem",
              color: "#0f172a",
            }}>
              <EyeOff size={18} />
            </div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Deterministic Pseudonyms</h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Names, emails, and identifiers are pseudonymized consistently within each workspace, but salted differently across workspaces to prevent correlation.
            </p>
          </div>

          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.25rem",
              color: "#0f172a",
            }}>
              <Shield size={18} />
            </div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Indirect Leakage Defense</h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Restricting a column like salary blocks both direct projection and indirect inferences such as aggregate functions (AVG, MAX) or filter conditions.
            </p>
          </div>

          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.25rem",
              color: "#0f172a",
            }}>
              <CheckCircle2 size={18} />
            </div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Sanitized Audit Logging</h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Every evaluation decision (ALLOW / DENY) is logged with the calling actor and timestamp, while stripping secrets, passwords, and raw document contents.
            </p>
          </div>
        </div>
      </div>

      {/* 3 Step Workflow */}
      <div style={{
        padding: "3.5rem 3rem",
        background: "#f8fafc",
        border: "1px solid var(--border-card)",
        borderRadius: "var(--radius-xl)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div className="slash-tag" style={{ justifyContent: "center" }}>WORKFLOW</div>
          <h2 className="font-editorial" style={{ fontSize: "2.2rem" }}>Three Steps to Safe AI Integration</h2>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "2rem",
        }}>
          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div className="step-number" style={{ marginBottom: "0.75rem" }}>01</div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Create Workspace &amp; Upload</h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Upload enterprise PDFs, text files, or tabular CSVs. Documents are parsed and indexed into isolated workspace tables.
            </p>
          </div>

          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div className="step-number" style={{ marginBottom: "0.75rem" }}>02</div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Configure Access Rules</h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Define file permissions, allowed MCP tools, and set field masking rules (e.g. mask emails, pseudonymize names, deny salaries).
            </p>
          </div>

          <div className="frosted-panel" style={{ padding: "2rem" }}>
            <div className="step-number" style={{ marginBottom: "0.75rem" }}>03</div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Connect Claude Desktop / Agent</h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Generate an MCP credential and add the URL snippet to your client config. Your model queries data safely within your rules.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
