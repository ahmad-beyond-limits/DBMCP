"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useGateway } from "@/lib/GatewayContext";
import { api } from "@/lib/api";
import { ArrowUpRight, LogOut, LayoutDashboard } from "lucide-react";

export default function Navbar() {
  const { isReady, checkAndNavigate } = useGateway();
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("dbmcp_access_token") : null;
    setIsLoggedIn(!!token);
  }, [pathname]);

  const handleLogout = () => {
    api.logout();
    setIsLoggedIn(false);
    router.push("/login");
  };

  return (
    <div style={{
      position: "sticky",
      top: "0.75rem",
      zIndex: 100,
      width: "100%",
      maxWidth: "1160px",
      margin: "0 auto",
      padding: "0 clamp(0.75rem, 3vw, 1.5rem)",
    }}>
      <header style={{
        minHeight: "56px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid var(--glass-border)",
        background: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
        boxShadow: "0 8px 24px -4px rgba(15, 23, 42, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.4rem 0.85rem",
        gap: "0.5rem",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.4rem", textDecoration: "none" }}>
            <span style={{
              fontWeight: 700,
              fontSize: "1.05rem",
              letterSpacing: "-0.03em",
              color: "#0f172a",
              display: "flex",
              alignItems: "center",
              gap: "0.15rem",
            }}>
              <span style={{ color: "var(--accent-lime-bright)" }}>/</span>ABOX
            </span>
            <span style={{
              fontSize: "0.65rem",
              fontWeight: 600,
              color: "var(--accent-lime)",
              background: "var(--accent-lime-bg)",
              border: "1px solid var(--accent-lime-border)",
              padding: "0.12rem 0.4rem",
              borderRadius: "var(--radius-pill)",
              letterSpacing: "0.04em",
            }}>
              GATEWAY
            </span>
          </Link>

          {/* Live Status Pill */}
          <div className="hidden sm:inline-flex" style={{
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.22rem 0.65rem",
            borderRadius: "var(--radius-pill)",
            background: isReady ? "rgba(132, 204, 22, 0.12)" : "rgba(245, 158, 11, 0.12)",
            border: isReady ? "1px solid rgba(132, 204, 22, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
            fontSize: "0.72rem",
            fontWeight: 500,
            color: isReady ? "var(--accent-lime)" : "#d97706",
          }}>
            <span style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: isReady ? "var(--accent-lime-bright)" : "#f59e0b",
            }} />
            <span>{isReady ? "Live" : "Waking Cloud..."}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {isLoggedIn ? (
            <>
              <button
                onClick={() => checkAndNavigate("/dashboard")}
                className={`pill-tab ${pathname.startsWith("/dashboard") || pathname.startsWith("/workspaces") ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
              >
                <LayoutDashboard size={13} />
                <span>Workspaces</span>
              </button>

              <button
                onClick={handleLogout}
                className="pill-btn pill-btn-glass"
                style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", gap: "0.3rem" }}
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => checkAndNavigate("/login")}
                className="pill-tab"
                style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
              >
                Sign In
              </button>

              <button
                onClick={() => checkAndNavigate("/register")}
                className="pill-btn pill-btn-solid"
                style={{ padding: "0.4rem 0.95rem", fontSize: "0.82rem" }}
              >
                <span>Get Started</span>
                <ArrowUpRight size={13} />
              </button>
            </>
          )}
        </div>
      </header>
    </div>
  );
}
