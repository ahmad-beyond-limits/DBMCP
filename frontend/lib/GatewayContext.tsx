"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Cloud, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { getApiBase } from "@/lib/api";

interface GatewayContextType {
  isReady: boolean;
  isWaking: boolean;
  checkAndNavigate: (targetUrl: string) => void;
}

const GatewayContext = createContext<GatewayContextType>({
  isReady: false,
  isWaking: false,
  checkAndNavigate: () => {},
});

export const useGateway = () => useContext(GatewayContext);

export function GatewayProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [isWaking, setIsWaking] = useState(false);
  const [progress, setProgress] = useState(10);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  const apiBase = getApiBase();

  // Check health on initial mount
  useEffect(() => {
    let isMounted = true;

    const ping = async () => {
      try {
        const res = await fetch(`${apiBase}/health`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        if (res.ok && isMounted) {
          setIsReady(true);
          setIsWaking(false);
          setProgress(100);
        }
      } catch (err) {
        // Backend is sleeping/cold starting
        if (isMounted) {
          setIsReady(false);
        }
      }
    };

    ping();

    // Regular heartbeat every 45 seconds to keep the free Render instance awake while user is browsing
    const interval = setInterval(ping, 45000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [apiBase]);

  // Polling mechanism when waking modal is active
  useEffect(() => {
    if (!isWaking) return;

    let progressTimer: NodeJS.Timeout;
    let pollTimer: NodeJS.Timeout;
    let cancelled = false;

    // Smoothly increment progress bar up to 92%
    progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev < 90) {
          return prev + Math.floor(Math.random() * 8) + 3;
        }
        return prev;
      });
    }, 1200);

    const pollBackend = async () => {
      try {
        const res = await fetch(`${apiBase}/health`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        if (res.ok && !cancelled) {
          setProgress(100);
          setIsReady(true);
          setTimeout(() => {
            setIsWaking(false);
            if (pendingRoute) {
              const target = pendingRoute;
              setPendingRoute(null);
              router.push(target);
            }
          }, 600);
          return;
        }
      } catch (e) {
        // Still waking up
      }

      if (!cancelled) {
        pollTimer = setTimeout(pollBackend, 2500);
      }
    };

    pollBackend();

    return () => {
      cancelled = true;
      clearInterval(progressTimer);
      clearTimeout(pollTimer);
    };
  }, [isWaking, apiBase, pendingRoute, router]);

  // Action called when user clicks Login, Register, or Get Started
  const checkAndNavigate = (targetUrl: string) => {
    if (isReady) {
      // Backend is already alive, navigate immediately with 0 delay!
      router.push(targetUrl);
    } else {
      // Backend is cold, show friendly waking progress modal
      setPendingRoute(targetUrl);
      setProgress(15);
      setIsWaking(true);
    }
  };

  return (
    <GatewayContext.Provider value={{ isReady, isWaking, checkAndNavigate }}>
      {children}

      {/* Modern Cold Start Waking Modal */}
      {isWaking && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1.5rem",
        }}>
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: "460px",
            padding: "2.75rem 2.25rem",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius-xl)",
            textAlign: "center",
            background: "#ffffff",
          }}>
            {/* Pulsing Cloud Icon */}
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem auto",
              color: "#2563eb",
              position: "relative",
            }}>
              <Cloud size={28} />
              <div style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}>
                <Loader2 size={11} className="animate-spin" />
              </div>
            </div>

            <div className="slash-tag" style={{ justifyContent: "center" }}>
              RENDER CLOUD GATEWAY
            </div>

            <h2 className="font-editorial" style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "#0f172a" }}>
              Please wait, we are getting ready
            </h2>

            <p style={{
              fontSize: "0.88rem",
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              marginBottom: "1.75rem",
            }}>
              The backend is waking up from idle state. You will be redirected automatically as soon as it is online.
            </p>

            {/* Progress Bar */}
            <div style={{
              width: "100%",
              height: "8px",
              background: "#f1f5f9",
              borderRadius: "var(--radius-pill)",
              overflow: "hidden",
              marginBottom: "0.85rem",
            }}>
              <div style={{
                height: "100%",
                width: `${progress}%`,
                background: "linear-gradient(90deg, #2563eb 0%, #38bdf8 100%)",
                borderRadius: "var(--radius-pill)",
                transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
              }} />
            </div>

            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              fontFamily: "JetBrains Mono, monospace",
            }}>
              <span>Spinning up server...</span>
              <span>{Math.min(progress, 100)}%</span>
            </div>
          </div>
        </div>
      )}
    </GatewayContext.Provider>
  );
}
