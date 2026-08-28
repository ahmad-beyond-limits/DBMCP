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
      top: "1.25rem",
      zIndex: 100,
      width: "100%",
      maxWidth: "1160px",
      margin: "0 auto",
      padding: "0 1.5rem",
    }}>
      <header style={{
        height: "58px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid var(--glass-border)",
        background: "rgba(255, 255, 255, 0.82)",
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
        boxShadow: "0 8px 24px -4px rgba(15, 23, 42, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.25rem",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
            <span style={{
              fontWeight: 700,
              fontSize: "1.15rem",
              letterSpacing: "-0.03em",
              color: "#0f172a",
              display: "flex",
              alignItems: "center",
              gap: "0.2rem",
            }}>
              <span style={{ color: "var(--accent-lime-bright)" }}>/</span>DBMCP
            </span>
            <span style={{
              fontSize: "0.68rem",
              fontWeight: 600,
              color: "var(--accent-lime)",
              background: "var(--accent-lime-bg)",
              border: "1px solid var(--accent-lime-border)",
              padding: "0.15rem 0.45rem",
              borderRadius: "var(--radius-pill)",
              letterSpacing: "0.04em",
            }}>
              GATEWAY
            </span>
          </Link>

          {/* Live Status Pill */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.25rem 0.75rem",
            borderRadius: "var(--radius-pill)",
            background: isReady ? "rgba(132, 204, 22, 0.12)" : "rgba(245, 158, 11, 0.12)",
            border: isReady ? "1px solid rgba(132, 204, 22, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
            fontSize: "0.75rem",
            fontWeight: 500,
            color: isReady ? "var(--accent-lime)" : "#d97706",
          }}>
            <span style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: isReady ? "var(--accent-lime-bright)" : "#f59e0b",
            }} />
            <span>{isReady ? "Gateway Live" : "Waking Cloud Server..."}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {isLoggedIn ? (
            <>
              <button
                onClick={() => checkAndNavigate("/dashboard")}
                className={`pill-tab ${pathname.startsWith("/dashboard") || pathname.startsWith("/workspaces") ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <LayoutDashboard size={14} />
                <span>Workspaces</span>
              </button>

              <button
                onClick={handleLogout}
                className="pill-btn pill-btn-glass"
                style={{ padding: "0.4rem 0.95rem", fontSize: "0.82rem", gap: "0.35rem" }}
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => checkAndNavigate("/login")}
                className="pill-tab"
              >
                Sign In
              </button>

              <button
                onClick={() => checkAndNavigate("/register")}
                className="pill-btn pill-btn-solid"
                style={{ padding: "0.45rem 1.15rem", fontSize: "0.84rem" }}
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
