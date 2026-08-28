import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DBMCP | Policy-Enforced AI Data Workspace",
  description: "Secure workspace exposing documents and structured data to AI models via MCP with zero-trust policy enforcement.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          {/* Main Floating Navigation Header */}
          <header style={{
            height: "70px",
            borderBottom: "1px solid var(--border-subtle)",
            background: "rgba(7, 10, 17, 0.8)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            position: "sticky",
            top: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 2.5rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
              <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.85rem", textDecoration: "none" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "1.15rem",
                  color: "#ffffff",
                  boxShadow: "0 0 20px rgba(56, 189, 248, 0.4)",
                }}>
                  /
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.03em", color: "#f8fafc" }}>
                      DBMCP
                    </span>
                    <span style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "#38bdf8",
                      background: "rgba(56, 189, 248, 0.12)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      padding: "0.15rem 0.45rem",
                      borderRadius: "4px",
                      letterSpacing: "0.06em",
                    }}>
                      GATEWAY
                    </span>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Policy-Enforced AI Workspace
                  </span>
                </div>
              </Link>

              {/* Status Indicator Pill */}
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.28rem 0.85rem",
                borderRadius: "var(--radius-pill)",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#34d399",
              }}>
                <span style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 10px #10b981",
                }} />
                <span>Zero-Trust Protocol Active</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
              <Link href="/dashboard" className="pill-tab" style={{ textDecoration: "none" }}>
                Workspaces
              </Link>
              <Link href="/login" className="pill-btn pill-btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}>
                Sign In
                <div className="btn-arrow-circle">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </div>
          </header>

          {/* Body Content */}
          <main style={{ flex: 1, position: "relative", zIndex: 1 }}>
            {children}
          </main>

          {/* Clean Editorial Footer */}
          <footer style={{
            borderTop: "1px solid var(--border-subtle)",
            padding: "2rem 2.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.82rem",
            color: "var(--text-muted)",
            background: "rgba(7, 10, 17, 0.95)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span className="slash-tag" style={{ margin: 0 }}>DBMCP</span>
              <span>MCP is the access protocol. The workspace policy engine is the security boundary.</span>
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--text-dim)", fontSize: "0.75rem" }}>
              v1.0.0 (Supabase + Render Ready)
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
