import type { Metadata } from "next";
import "./globals.css";
import { GatewayProvider } from "@/lib/GatewayContext";
import Navbar from "./Navbar";

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
        <GatewayProvider>
          <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-main)" }}>
            {/* Global Navbar with Instant Warmup Detection */}
            <Navbar />

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
        </GatewayProvider>
      </body>
    </html>
  );
}
