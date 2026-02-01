"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { NotificationProvider } from "./NotificationPrompt";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Public routes that don't need the sidebar
  const publicRoutes = ["/login", "/register"];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Show loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // If not authenticated and not on public route, the middleware will redirect
  // If on public route, don't show sidebar
  if (isPublicRoute || !session) {
    return <>{children}</>;
  }

  // Authenticated user on private route - show sidebar layout
  return (
    <NotificationProvider>
      <div className="min-h-screen bg-[#fafafa]">
        <Sidebar />
        <main className="lg:ml-64">
          {children}
        </main>
      </div>
    </NotificationProvider>
  );
}
