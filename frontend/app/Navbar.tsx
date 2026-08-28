"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useGateway } from "@/lib/GatewayContext";
import { api } from "@/lib/api";
import {
  ArrowUpRight,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  Home,
  Shield,
  Key,
} from "lucide-react";

export default function Navbar() {
  const { isReady, checkAndNavigate } = useGateway();
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("dbmcp_access_token") : null;
    setIsLoggedIn(!!token);
  }, [pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    api.logout();
    setIsLoggedIn(false);
    setMobileMenuOpen(false);
    router.push("/login");
  };

  const handleMobileNav = (targetPath: string) => {
    setMobileMenuOpen(false);
    checkAndNavigate(targetPath);
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
        border: "1px solid rgba(40, 40, 40, 0.05)",
        background: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: "0 2px 12px rgba(0, 0, 0, 0.02)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.4rem 0.85rem",
        gap: "0.5rem",
        position: "relative",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
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

          {/* Desktop Live Status Pill */}
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

        {/* Desktop Navigation */}
        <div className="navbar-desktop-actions">
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

        {/* Mobile Hamburger Toggle Button */}
        <div className="navbar-mobile-toggle">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="icon-circle-btn"
            style={{
              width: "38px",
              height: "38px",
              background: mobileMenuOpen ? "var(--text-primary)" : "rgba(255, 255, 255, 0.9)",
              color: mobileMenuOpen ? "#FFFFFF" : "var(--text-primary)",
              border: "1px solid rgba(40, 40, 40, 0.08)",
            }}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? (
              <X size={16} strokeWidth={1.5} />
            ) : (
              <Menu size={16} strokeWidth={1.5} />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Dropdown Menu Card */}
      {mobileMenuOpen && (
        <div style={{
          marginTop: "0.6rem",
          background: "rgba(255, 255, 255, 0.96)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid rgba(40, 40, 40, 0.06)",
          boxShadow: "var(--shadow-lg)",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          animation: "fadeIn 0.2s ease-out",
        }}>
          {/* Mobile Gateway Status Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.5rem 0.75rem",
            background: "var(--bg-page)",
            borderRadius: "var(--radius-pill)",
            fontSize: "0.78rem",
            color: "var(--text-secondary)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <span style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: isReady ? "#2E3032" : "#989B9D",
              }} />
              <span style={{ fontWeight: 450, color: "var(--text-primary)" }}>
                {isReady ? "Gateway Active" : "Waking Cloud Engine..."}
              </span>
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", fontFamily: "JetBrains Mono, monospace" }}>
              v2024-11-05
            </span>
          </div>

          {/* Mobile Navigation Links */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <button
              onClick={() => handleMobileNav("/")}
              className="pill-tab"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                background: pathname === "/" ? "#FFFFFF" : "transparent",
                border: pathname === "/" ? "1px solid rgba(40, 40, 40, 0.06)" : "1px solid transparent",
                fontWeight: pathname === "/" ? 500 : 400,
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                textAlign: "left",
              }}
            >
              <Home size={16} strokeWidth={1.5} />
              <span>Overview</span>
            </button>

            {isLoggedIn && (
              <button
                onClick={() => handleMobileNav("/dashboard")}
                className="pill-tab"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-md)",
                  background: pathname.startsWith("/dashboard") || pathname.startsWith("/workspaces") ? "#FFFFFF" : "transparent",
                  border: pathname.startsWith("/dashboard") || pathname.startsWith("/workspaces") ? "1px solid rgba(40, 40, 40, 0.06)" : "1px solid transparent",
                  fontWeight: pathname.startsWith("/dashboard") || pathname.startsWith("/workspaces") ? 500 : 400,
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                  textAlign: "left",
                }}
              >
                <LayoutDashboard size={16} strokeWidth={1.5} />
                <span>Workspaces Vault</span>
              </button>
            )}
          </div>

          {/* Mobile Actions Footer */}
          <div style={{
            borderTop: "1px solid rgba(40, 40, 40, 0.04)",
            paddingTop: "0.85rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}>
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="pill-btn pill-btn-glass"
                style={{
                  width: "100%",
                  padding: "0.7rem",
                  justifyContent: "center",
                  color: "var(--status-deny)",
                  fontSize: "0.85rem",
                }}
              >
                <LogOut size={15} strokeWidth={1.5} />
                <span>Sign Out</span>
              </button>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem", width: "100%" }}>
                <button
                  onClick={() => handleMobileNav("/login")}
                  className="pill-btn pill-btn-glass"
                  style={{
                    flex: 1,
                    padding: "0.7rem",
                    justifyContent: "center",
                    fontSize: "0.85rem",
                  }}
                >
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => handleMobileNav("/register")}
                  className="pill-btn pill-btn-solid"
                  style={{
                    flex: 1.2,
                    padding: "0.7rem",
                    justifyContent: "center",
                    fontSize: "0.85rem",
                  }}
                >
                  <span>Get Started</span>
                  <ArrowUpRight size={14} strokeWidth={1.5} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
