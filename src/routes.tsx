// src/routes.tsx
import { createBrowserRouter, redirect } from "react-router-dom";
import AppLayout from "@/components/layouts/AppLayout";
import Home from "@/pages/Home";
import Create from "@/pages/Create";
import Review from "@/pages/Review";
import MyDesigns from "@/pages/MyDesigns";
import AuthPage from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: "create", element: <Create /> },
      {
        path: "review/:taskId",
        element: <Review />,
        loader: async ({ params }) => {
          const id = (params.taskId ?? "").replace(/^:/, "");
          if (!UUID_RE.test(id)) throw redirect("/create");
          return null;
        },
      },
      { path: "my-designs", element: <MyDesigns /> },
      { path: "auth", element: <AuthPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
