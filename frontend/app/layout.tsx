import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DBMCP | Policy-Enforced AI Data Workspace",
  description: "Expose enterprise documents and structured data to AI models via MCP with granular policies and PII anonymisation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-main)" }}>
          {/* Main Floating Navigation Header */}
          <header style={{
            height: "64px",
            borderBottom: "1px solid var(--border-card)",
            background: "rgba(255, 255, 255, 0.88)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            position: "sticky",
            top: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 2.5rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
              <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "1rem",
                  color: "#ffffff",
                }}>
                  /
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.03em", color: "#0f172a" }}>
                    DBMCP
                  </span>
                  <span style={{
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    background: "#f1f5f9",
                    padding: "0.15rem 0.45rem",
                    borderRadius: "4px",
                    letterSpacing: "0.04em",
                  }}>
                    GATEWAY
                  </span>
                </div>
              </Link>

              {/* Status Pill */}
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.25rem 0.75rem",
                borderRadius: "var(--radius-pill)",
                background: "#f1f5f9",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}>
                <span style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#10b981",
                }} />
                <span>Protocol v2024-11-05</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
              <Link href="/dashboard" className="pill-tab" style={{ textDecoration: "none", color: "var(--text-secondary)" }}>
                Workspaces
              </Link>
              <Link href="/login" className="pill-btn pill-btn-primary" style={{ padding: "0.45rem 1.15rem", fontSize: "0.85rem" }}>
                Sign In
                <div className="btn-arrow-circle">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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

          {/* Clean Minimalist Footer */}
          <footer style={{
            borderTop: "1px solid var(--border-card)",
            padding: "2rem 2.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.82rem",
            color: "var(--text-muted)",
            background: "#ffffff",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span className="slash-tag" style={{ margin: 0 }}>DBMCP</span>
              <span>Model Context Protocol Gateway with Granular Policy Enforcement.</span>
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--text-dim)", fontSize: "0.75rem" }}>
              Open Source MVP
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
