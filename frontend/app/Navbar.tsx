"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useGateway } from "@/lib/GatewayContext";
import { api } from "@/lib/api";
import { ArrowUpRight, LogOut, LayoutDashboard, ShieldCheck } from "lucide-react";

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
      top: "1rem",
      zIndex: 100,
      width: "100%",
      maxWidth: "1160px",
      margin: "0 auto",
      padding: "0 clamp(0.75rem, 3vw, 1.5rem)",
    }}>
      <header style={{
        minHeight: "56px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid rgba(40, 40, 40, 0.05)",
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: "0 2px 12px rgba(0, 0, 0, 0.02)",
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
              fontWeight: 500,
              fontSize: "1.05rem",
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: "0.2rem",
            }}>
              <span style={{ color: "var(--text-tertiary)" }}>/</span> ABOX
            </span>
            <span style={{
              fontSize: "0.68rem",
              fontWeight: 450,
              color: "var(--text-secondary)",
              background: "rgba(0, 0, 0, 0.04)",
              border: "1px solid rgba(40, 40, 40, 0.06)",
              padding: "0.15rem 0.5rem",
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
            padding: "0.25rem 0.75rem",
            borderRadius: "var(--radius-pill)",
            background: "rgba(255, 255, 255, 0.65)",
            border: "1px solid rgba(40, 40, 40, 0.05)",
            fontSize: "0.74rem",
            fontWeight: 400,
            color: "var(--text-secondary)",
          }}>
            <span style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: isReady ? "#2E3032" : "#989B9D",
            }} />
            <span>{isReady ? "Gateway Active" : "Waking Cloud..."}</span>
          </div>
        </div>

        {/* Right Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {isLoggedIn ? (
            <>
              <button
                onClick={() => checkAndNavigate("/dashboard")}
                className="pill-btn pill-btn-glass"
                style={{
                  padding: "0.45rem 1rem",
                  fontSize: "0.82rem",
                  gap: "0.4rem",
                  color: pathname.startsWith("/dashboard") || pathname.startsWith("/workspaces") ? "var(--text-primary)" : "var(--text-secondary)",
                  background: pathname.startsWith("/dashboard") || pathname.startsWith("/workspaces") ? "#FFFFFF" : "rgba(255, 255, 255, 0.5)",
                }}
              >
                <LayoutDashboard size={14} strokeWidth={1.5} />
                <span>Workspaces</span>
              </button>

              <button
                onClick={handleLogout}
                className="pill-btn pill-btn-glass"
                style={{
                  padding: "0.45rem 0.85rem",
                  fontSize: "0.82rem",
                  color: "var(--text-secondary)",
                }}
                title="Log Out"
              >
                <LogOut size={14} strokeWidth={1.5} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => checkAndNavigate("/login")}
                className="pill-tab"
                style={{
                  fontSize: "0.84rem",
                  padding: "0.45rem 0.85rem",
                  color: "var(--text-secondary)",
                }}
              >
                Sign In
              </button>

              <button
                onClick={() => checkAndNavigate("/register")}
                className="pill-btn pill-btn-solid"
                style={{
                  padding: "0.45rem 1.15rem",
                  fontSize: "0.82rem",
                  gap: "0.35rem",
                }}
              >
                <span>Get Started</span>
                <ArrowUpRight size={13} strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>
      </header>
    </div>
  );
}
