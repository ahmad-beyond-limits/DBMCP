"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useGateway } from "@/lib/GatewayContext";
import { api } from "@/lib/api";
import { ArrowRight, LogOut, LayoutDashboard, User } from "lucide-react";

export default function Navbar() {
  const { isReady, checkAndNavigate } = useGateway();
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check auth token on mount and whenever pathname changes
    const token = api.getToken();
    setIsLoggedIn(!!token);
  }, [pathname]);

  const handleLogout = () => {
    api.logout();
    setIsLoggedIn(false);
    router.push("/login");
  };

  return (
    <header style={{
      height: "64px",
      borderBottom: "1px solid var(--border-card)",
      background: "rgba(255, 255, 255, 0.85)",
      backdropFilter: "blur(18px)",
      WebkitBackdropFilter: "blur(18px)",
      position: "sticky",
      top: 0,
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 clamp(1.25rem, 4vw, 2.5rem)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1.75rem" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <span style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.03em", color: "#0f172a" }}>
              DBMCP
            </span>
            <span style={{
              fontSize: "0.68rem",
              fontWeight: 700,
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

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {isLoggedIn ? (
          <>
            <button
              onClick={() => checkAndNavigate("/dashboard")}
              className={`pill-tab ${pathname.startsWith("/dashboard") || pathname.startsWith("/workspaces") ? "active" : ""}`}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}
            >
              <LayoutDashboard size={14} />
              <span>Workspaces</span>
            </button>

            <button
              onClick={handleLogout}
              className="pill-btn pill-btn-dark"
              style={{ padding: "0.45rem 1rem", fontSize: "0.82rem", gap: "0.4rem" }}
              title="Sign out"
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
              style={{ cursor: "pointer" }}
            >
              Sign In
            </button>

            <button
              onClick={() => checkAndNavigate("/register")}
              className="pill-btn pill-btn-primary"
              style={{ padding: "0.45rem 1.15rem", fontSize: "0.85rem" }}
            >
              Get Started
              <div className="btn-arrow-circle">
                <ArrowRight size={11} />
              </div>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
