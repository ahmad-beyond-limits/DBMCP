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
          {/* Main Navigation Header */}
          <header style={{
            height: "64px",
            borderBottom: "1px solid var(--border-subtle)",
            background: "rgba(9, 13, 22, 0.8)",
            backdropFilter: "blur(16px)",
            position: "sticky",
            top: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 2rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
              <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "8px",
                  background: "var(--accent-gradient)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "1.1rem",
                  color: "#fff",
                  boxShadow: "var(--accent-glow)",
                }}>
                  P
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 700, letterSpacing: "-0.02em", fontSize: "1.05rem" }}>
                    DBMCP <span style={{ color: "var(--accent-primary)" }}>GATEWAY</span>
                  </span>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Policy-Enforced AI Workspace
                  </span>
                </div>
              </Link>

              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.25rem 0.75rem",
                borderRadius: "9999px",
                background: "rgba(99, 102, 241, 0.1)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
                fontSize: "0.75rem",
                color: "#a5b4fc",
              }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                MCP Protocol: Active
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <Link href="/dashboard" style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                Workspaces
              </Link>
              <Link href="/login" className="btn-secondary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.85rem" }}>
                Sign In
              </Link>
            </div>
          </header>

          {/* Body Content */}
          <main style={{ flex: 1, position: "relative", zIndex: 1 }}>
            {children}
          </main>

          {/* Footer */}
          <footer style={{
            borderTop: "1px solid var(--border-subtle)",
            padding: "1.5rem 2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            background: "rgba(9, 13, 22, 0.9)",
          }}>
            <div>MCP is the access protocol. The workspace policy engine is the security boundary.</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace" }}>v1.0.0-MVP (Render Ready)</div>
          </footer>
        </div>
      </body>
    </html>
  );
}
