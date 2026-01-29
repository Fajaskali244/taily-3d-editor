import { createBrowserRouter, Navigate, redirect } from "react-router-dom";
import { lazy, Suspense } from "react";

// Eager-load critical pages
import Index from "@/pages/Index";
import Create from "@/pages/Create";
import DesignView from "@/pages/DesignView";

// Lazy-load secondary pages
const Review = lazy(() => import("@/pages/Review"));
const MyDesigns = lazy(() => import("@/pages/MyDesigns"));
const Auth = lazy(() => import("@/pages/Auth"));
const AdminOrders = lazy(() => import("@/pages/AdminOrders"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Studio = lazy(() => import("@/pages/Studio"));

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
);

export const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <SuspenseWrapper><NotFound /></SuspenseWrapper>,
    children: [
      { index: true, element: <Index /> },
      { path: "create", element: <Create /> },
      {
        path: "review/:taskId",
        element: <SuspenseWrapper><Review /></SuspenseWrapper>,
        loader: async ({ params }) => {
          const id = (params.taskId ?? "").replace(/^:/, "");
          if (!UUID_RE.test(id)) {
            throw redirect("/create");
          }
          return null;
        },
      },
      { path: "my-designs", element: <SuspenseWrapper><MyDesigns /></SuspenseWrapper> },
      { path: "design/:id", element: <DesignView /> },
      { path: "auth", element: <SuspenseWrapper><Auth /></SuspenseWrapper> },
      { path: "admin/orders", element: <SuspenseWrapper><AdminOrders /></SuspenseWrapper> },
      { path: "studio", element: <SuspenseWrapper><Studio /></SuspenseWrapper> },

      // Legacy redirect for old test-hybrid URL
      { path: "test-hybrid", element: <Navigate to="/studio" replace /> },

      // Legacy redirects
      { path: "customize-classic", element: <Navigate to="/create" replace /> },
      { path: "customize/*", element: <Navigate to="/create" replace /> },
      { path: "cart", element: <Navigate to="/my-designs" replace /> },
      { path: "catalog", element: <Navigate to="/create" replace /> },
      { path: "designs", element: <Navigate to="/my-designs" replace /> },
      { path: "editor", element: <Navigate to="/create" replace /> },

      { path: "*", element: <SuspenseWrapper><NotFound /></SuspenseWrapper> },
    ],
  },
]);
