import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Web3ModalProvider } from "../api/web3_config";
import { AuthProvider } from "../context/AuthContext";
import { useAuth } from "../context/AuthContext";

// ─── Route → allowed role(s) map ───────────────────────────────────────────
const PROTECTED_ROUTES = {
  "/doctor":  ["doctor"],
  "/herbs":   ["herbal_doctor"],
  "/patient": ["patient"],
  "/admin":   ["admin"],
};

// Public routes (no auth required)
const PUBLIC_ROUTES = ["/", "/login", "/register", "/pending-verification"];

function RouteGuard({ children }) {
  const { isAuthenticated, role, status } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const path = router.pathname;

    // Always allow public routes
    if (PUBLIC_ROUTES.some((pub) => path === pub || path.startsWith(pub + "/"))) {
      setAuthorized(true);
      return;
    }

    // Not authenticated → redirect to /login
    if (!isAuthenticated) {
      setAuthorized(false);
      router.replace("/login");
      return;
    }

    // Check role-based access
    const matchedPrefix = Object.keys(PROTECTED_ROUTES).find((prefix) =>
      path.startsWith(prefix)
    );

    if (matchedPrefix) {
      const allowedRoles = PROTECTED_ROUTES[matchedPrefix];
      if (!allowedRoles.includes(role)) {
        // Authenticated but wrong role → redirect to their own dashboard
        setAuthorized(false);
        if (role === "doctor")        router.replace("/doctor/dashboard");
        else if (role === "herbal_doctor") router.replace("/herbs/dashboard");
        else if (role === "patient")  router.replace("/patient/dashboard");
        else if (role === "admin")    router.replace("/admin/dashboard");
        else router.replace("/login");
        return;
      }
    }

    // Pending approval → only allow /pending-verification
    if (status === "pending_approval" && !path.startsWith("/pending-verification")) {
      setAuthorized(false);
      router.replace("/pending-verification");
      return;
    }

    setAuthorized(true);
  }, [router.pathname, isAuthenticated, role, status]);

  // Show nothing (blank) while deciding — prevents flash of protected content
  if (!authorized) return null;

  return <>{children}</>;
}

function MyApp({ Component, pageProps }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Web3ModalProvider>
      <AuthProvider>
        <RouteGuard>
          <Component {...pageProps} />
        </RouteGuard>
      </AuthProvider>
    </Web3ModalProvider>
  );
}

export default MyApp;