import type { Metadata } from "next";
import "./globals.css";
import { GatewayProvider } from "@/lib/GatewayContext";
import Navbar from "./Navbar";

export const metadata: Metadata = {
  title: "POAIS | Policy-Oriented AI Space",
  description: "Policy-Oriented AI Space (POAIS) - The Secure, Policy-Enforced Data Gateway for AI Agents & Model Context Protocol (MCP).",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-GLWLERBJ0H" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', 'G-GLWLERBJ0H');
            `,
          }}
        />
      </head>
      <body>
        <GatewayProvider>
          <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            {/* Global Navbar with Instant Warmup Detection */}
            <Navbar />

            {/* Body Content */}
            <main style={{ flex: 1, position: "relative", zIndex: 1 }}>
              {children}
            </main>

            {/* Clean Minimalist Footer */}
            <footer style={{
              borderTop: "1px solid rgba(40, 40, 40, 0.05)",
              padding: "2rem clamp(1rem, 3vw, 2.5rem)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
              background: "rgba(255, 255, 255, 0.6)",
              backdropFilter: "blur(20px)",
              flexWrap: "wrap",
              gap: "1rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <span className="slash-tag" style={{ margin: 0 }}>POAIS</span>
                <span>Policy-Oriented AI Space • Granular Model Context Protocol (MCP) Governance.</span>
              </div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--text-tertiary)", fontSize: "0.75rem" }}>
                POAIS v2.0
              </div>
            </footer>
          </div>
        </GatewayProvider>
      </body>
    </html>
  );
}
