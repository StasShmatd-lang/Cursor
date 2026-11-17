import { useEffect, useState } from "react";

type LinkBaseResponse = {
  publicOrigin: string | null;
  suggestedOrigin: string | null;
  lanOrigins: string[];
};

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function useLinkBase() {
  const [linkBase, setLinkBase] = useState(() => {
    const fromEnv = import.meta.env.VITE_PUBLIC_ORIGIN;
    if (typeof fromEnv === "string" && fromEnv.trim()) {
      return fromEnv.replace(/\/$/, "");
    }
    return window.location.origin;
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/link-base");
        if (!res.ok) return;
        const data = (await res.json()) as LinkBaseResponse;
        if (cancelled) return;
        const host = window.location.hostname;
        if (data.publicOrigin) {
          setLinkBase(data.publicOrigin.replace(/\/$/, ""));
          return;
        }
        if (!isLocalHost(host)) {
          setLinkBase(window.location.origin);
          return;
        }
        if (data.suggestedOrigin) {
          setLinkBase(data.suggestedOrigin.replace(/\/$/, ""));
        }
      } catch {
        /* keep current origin */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return linkBase;
}