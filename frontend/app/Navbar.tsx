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
  ShieldAlert,
  Key,
  Settings,
  UserCheck,
} from "lucide-react";

export default function Navbar() {
  const { isReady, checkAndNavigate } = useGateway();
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [impersonateTarget, setImpersonateTarget] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("dbmcp_access_token") : null;
    setIsLoggedIn(!!token);

    const target = typeof window !== "undefined" ? sessionStorage.getItem("admin_impersonate_target") : null;
    setImpersonateTarget(target);

    if (token) {
      api.getMe().then((me) => {
        setIsSuperuser(!!me.is_superuser);
      }).catch(() => {
        setIsSuperuser(false);
      });
    } else {
      setIsSuperuser(false);
    }
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
      maxWidth: "1180px",
      margin: "0 auto",
      padding: "0 clamp(0.75rem, 3vw, 1.5rem)",
    }}>
      {/* Ghost Mode Impersonation Alert Banner */}
      {impersonateTarget && (
        <div style={{
          background: "linear-gradient(90deg, #F59E0B 0%, #D97706 100%)",
          color: "#FFFFFF",
          borderRadius: "var(--radius-pill)",
          padding: "0.45rem 1rem",
          marginBottom: "0.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.82rem",
          fontWeight: 500,
          boxShadow: "0 4px 14px rgba(217, 119, 6, 0.25)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1rem" }}>🕵️</span>
            <span>GHOST MODE: Viewing platform as <strong>@{impersonateTarget}</strong></span>
          </div>
          <button
            onClick={() => api.exitImpersonation()}
            className="pill-btn-sm"
            style={{
              background: "#FFFFFF",
              color: "#B45309",
              border: "none",
              fontWeight: 600,
              fontSize: "0.75rem",
              padding: "0.2rem 0.65rem",
            }}
          >
            Exit Impersonation ↩
          </button>
        </div>
      )}

      <header style={{
        minHeight: "58px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid rgba(255, 255, 255, 0.7)",
        background: "rgba(255, 255, 255, 0.55)",
        backdropFilter: "blur(28px) saturate(190%)",
        WebkitBackdropFilter: "blur(28px) saturate(190%)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.04), inset 0 1px 2px rgba(255, 255, 255, 0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.45rem 1rem",
        gap: "0.5rem",
        position: "relative",
      }}>
        {/* Brand & Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
            {/* Vibrant Open Geometric POAIS Insignia */}
            <div style={{
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              flexShrink: 0,
            }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 2px 8px rgba(99, 102, 241, 0.35))" }}>
                <defs>
                  <linearGradient id="poaisGradPrimary" x1="2" y1="2" x2="34" y2="34" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#4F46E5" />
                    <stop offset="45%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                  <linearGradient id="poaisGradSecondary" x1="34" y1="2" x2="2" y2="34" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#06B6D4" />
                    <stop offset="50%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                  <linearGradient id="poaisGlassFill" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="rgba(99, 102, 241, 0.12)" />
                    <stop offset="100%" stopColor="rgba(6, 182, 212, 0.06)" />
                  </linearGradient>
                </defs>

                {/* Ambient Frosted Glass Base */}
                <rect x="2" y="2" width="32" height="32" rx="10" fill="url(#poaisGlassFill)" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="1" />

                {/* Outer Spatial Shield Polygon (Open strokes) */}
                <path
                  d="M18 6.5L27.5 11V18.2C27.5 24 23.5 28.5 18 30.5C12.5 28.5 8.5 24 8.5 18.2V11L18 6.5Z"
                  stroke="url(#poaisGradPrimary)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Dynamic Interlocking Spatial Orbitals */}
                <ellipse cx="18" cy="18" rx="11" ry="4.5" transform="rotate(-32 18 18)" stroke="url(#poaisGradSecondary)" strokeWidth="1.8" strokeLinecap="round" />
                <ellipse cx="18" cy="18" rx="11" ry="4.5" transform="rotate(32 18 18)" stroke="url(#poaisGradPrimary)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="18 4" />

                {/* Glowing Nucleus Core Node */}
                <circle cx="18" cy="18" r="3.2" fill="url(#poaisGradPrimary)" />
                <circle cx="18" cy="18" r="1.4" fill="#FFFFFF" />
              </svg>
            </div>

            <span style={{
              fontWeight: 600,
              fontSize: "1.22rem",
              letterSpacing: "-0.04em",
              background: "linear-gradient(135deg, #1E2022 0%, #3B4252 60%, #4F46E5 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              display: "inline-block",
            }}>
              POAIS
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="navbar-desktop-actions">
          {isLoggedIn ? (
            <>
              <button
                onClick={() => checkAndNavigate("/dashboard")}
                className="pill-btn"
                style={{
                  padding: "0.42rem 0.95rem",
                  fontSize: "0.82rem",
                  gap: "0.4rem",
                  color: pathname.startsWith("/dashboard") || pathname.startsWith("/workspaces") ? "#1E2022" : "var(--text-secondary)",
                  background: pathname.startsWith("/dashboard") || pathname.startsWith("/workspaces") ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.5)",
                  border: pathname.startsWith("/dashboard") || pathname.startsWith("/workspaces") ? "1px solid rgba(40, 40, 40, 0.12)" : "1px solid rgba(255, 255, 255, 0.6)",
                  boxShadow: pathname.startsWith("/dashboard") || pathname.startsWith("/workspaces") ? "0 2px 8px rgba(0, 0, 0, 0.04)" : "none",
                  fontWeight: pathname.startsWith("/dashboard") || pathname.startsWith("/workspaces") ? 500 : 450,
                }}
              >
                <LayoutDashboard size={14} strokeWidth={1.5} />
                <span>Workspaces</span>
              </button>

              <button
                onClick={() => checkAndNavigate("/settings")}
                className="pill-btn"
                style={{
                  padding: "0.42rem 0.85rem",
                  fontSize: "0.82rem",
                  gap: "0.4rem",
                  color: pathname.startsWith("/settings") ? "#1E2022" : "var(--text-secondary)",
                  background: pathname.startsWith("/settings") ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.5)",
                  border: pathname.startsWith("/settings") ? "1px solid rgba(40, 40, 40, 0.12)" : "1px solid rgba(255, 255, 255, 0.6)",
                  boxShadow: pathname.startsWith("/settings") ? "0 2px 8px rgba(0, 0, 0, 0.04)" : "none",
                  fontWeight: pathname.startsWith("/settings") ? 500 : 450,
                }}
                title="Account Settings"
              >
                <Settings size={14} strokeWidth={1.5} />
                <span>Settings</span>
              </button>

              {isSuperuser && (
                <button
                  onClick={() => checkAndNavigate("/admin")}
                  className="pill-btn"
                  style={{
                    padding: "0.42rem 0.85rem",
                    fontSize: "0.82rem",
                    gap: "0.4rem",
                    color: pathname.startsWith("/admin") ? "#4F46E5" : "#6366F1",
                    background: pathname.startsWith("/admin") ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.08)",
                    border: "1px solid rgba(99, 102, 241, 0.3)",
                    fontWeight: 500,
                  }}
                  title="Master Admin Console"
                >
                  <ShieldAlert size={14} strokeWidth={1.5} />
                  <span>Admin</span>
                </button>
              )}

              <button
                onClick={handleLogout}
                className="pill-btn pill-btn-glass"
                style={{
                  padding: "0.42rem 0.85rem",
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
                  padding: "0.42rem 0.85rem",
                  color: "var(--text-primary)",
                  background: "rgba(255, 255, 255, 0.5)",
                  border: "1px solid rgba(255, 255, 255, 0.7)",
                }}
              >
                Sign In
              </button>

              <button
                onClick={() => checkAndNavigate("/register")}
                className="pill-btn pill-btn-solid"
                style={{
                  padding: "0.42rem 1.15rem",
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
          background: "rgba(255, 255, 255, 0.75)",
          backdropFilter: "blur(28px) saturate(190%)",
          WebkitBackdropFilter: "blur(28px) saturate(190%)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid rgba(255, 255, 255, 0.8)",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.9)",
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
            background: "rgba(255, 255, 255, 0.6)",
            borderRadius: "var(--radius-pill)",
            fontSize: "0.78rem",
            color: "var(--text-secondary)",
            border: "1px solid rgba(255, 255, 255, 0.8)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <span style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: isReady ? "#16A34A" : "#D97706",
              }} />
              <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                {isReady ? "POAIS Gateway Active" : "Waking Cloud Engine..."}
              </span>
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", fontFamily: "JetBrains Mono, monospace" }}>
              POAIS v2.0
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
                background: pathname === "/" ? "#FFFFFF" : "rgba(255, 255, 255, 0.4)",
                border: pathname === "/" ? "1px solid rgba(40, 40, 40, 0.08)" : "1px solid transparent",
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
              <>
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
                    background: pathname.startsWith("/dashboard") || pathname.startsWith("/workspaces") ? "#FFFFFF" : "rgba(255, 255, 255, 0.4)",
                    border: pathname.startsWith("/dashboard") || pathname.startsWith("/workspaces") ? "1px solid rgba(40, 40, 40, 0.08)" : "1px solid transparent",
                    fontWeight: pathname.startsWith("/dashboard") || pathname.startsWith("/workspaces") ? 500 : 400,
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                    textAlign: "left",
                  }}
                >
                  <LayoutDashboard size={16} strokeWidth={1.5} />
                  <span>Workspaces</span>
                </button>

                <button
                  onClick={() => handleMobileNav("/settings")}
                  className="pill-tab"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-md)",
                    background: pathname.startsWith("/settings") ? "#FFFFFF" : "rgba(255, 255, 255, 0.4)",
                    border: pathname.startsWith("/settings") ? "1px solid rgba(40, 40, 40, 0.08)" : "1px solid transparent",
                    fontWeight: pathname.startsWith("/settings") ? 500 : 400,
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                    textAlign: "left",
                  }}
                >
                  <Settings size={16} strokeWidth={1.5} />
                  <span>Settings</span>
                </button>

                {isSuperuser && (
                  <button
                    onClick={() => handleMobileNav("/admin")}
                    className="pill-tab"
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-md)",
                      background: pathname.startsWith("/admin") ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.08)",
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                      fontWeight: 500,
                      color: "#4F46E5",
                      fontSize: "0.9rem",
                      textAlign: "left",
                    }}
                  >
                    <ShieldAlert size={16} strokeWidth={1.5} />
                    <span>Admin Console</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Mobile Actions Footer */}
          <div style={{
            borderTop: "1px solid rgba(40, 40, 40, 0.06)",
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
