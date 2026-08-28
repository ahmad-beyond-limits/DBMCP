"use client";

import Link from "next/link";
import { useGateway } from "@/lib/GatewayContext";
import { ArrowRight } from "lucide-react";

export default function Navbar() {
  const { isReady, checkAndNavigate } = useGateway();

  return (
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

        {/* Live Gateway Status Pill */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.45rem",
          padding: "0.25rem 0.75rem",
          borderRadius: "var(--radius-pill)",
          background: isReady ? "#ecfdf5" : "#fffbeb",
          border: isReady ? "1px solid #a7f3d0" : "1px solid #fde68a",
          fontSize: "0.75rem",
          fontWeight: 600,
          color: isReady ? "#059669" : "#d97706",
          transition: "all 0.3s ease",
        }}>
          <span style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: isReady ? "#10b981" : "#f59e0b",
          }} />
          <span>{isReady ? "Gateway Online" : "Waking Cloud Server..."}</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        <button
          onClick={() => checkAndNavigate("/dashboard")}
          className="pill-tab"
          style={{ cursor: "pointer" }}
        >
          Workspaces
        </button>

        <button
          onClick={() => checkAndNavigate("/login")}
          className="pill-btn pill-btn-primary"
          style={{ padding: "0.45rem 1.15rem", fontSize: "0.85rem" }}
        >
          Sign In
          <div className="btn-arrow-circle">
            <ArrowRight size={11} />
          </div>
        </button>
      </div>
    </header>
  );
}
