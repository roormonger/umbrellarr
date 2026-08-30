import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./index.css";

import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { IconContext } from "@phosphor-icons/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppearanceProvider } from "./appearance/AppearanceProvider";
import { routeTree } from "./routeTree";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppearanceProvider>
        <IconContext.Provider value={{ size: 18, weight: "regular", color: "currentColor" }}>
          <Notifications position="top-right" />
          <RouterProvider router={router} />
        </IconContext.Provider>
      </AppearanceProvider>
    </QueryClientProvider>
  </StrictMode>,
);
