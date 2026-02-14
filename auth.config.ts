import type { NextAuthConfig } from "next-auth";

// This config is used by middleware (Edge runtime)
// Keep it lightweight - no database or Node.js APIs
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Public routes (no auth required)
      const isPublicRoute =
        pathname.startsWith("/login") ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/gopika-please-be-my-valentine");
      const isAuthAPI = pathname.startsWith("/api/auth");

      if (isPublicRoute || isAuthAPI) {
        return true;
      }

      // Redirect to login if not authenticated
      if (!isLoggedIn) {
        return false;
      }

      return true;
    },
  },
  providers: [], // Providers are added in auth.ts
} satisfies NextAuthConfig;
