import { lazy, Suspense } from "react";
import { createHashRouter } from "react-router-dom";
import Shell from "./components/shell/Shell";
import Overview from "./views/Overview";
import Insights from "./views/Insights";
import Landscape from "./views/Landscape";
import Company from "./views/Company";

// Lazy-loaded: Three.js + react-three-fiber + drei only get downloaded by
// visitors who actually open the Hologram page, instead of bloating every
// other route's initial bundle (this one dependency chain is most of the
// app's JS weight).
const Hologram = lazy(() => import("./views/Hologram"));

// A "data router" (createHashRouter + <RouterProvider>, wired up in
// main.jsx) rather than the plain <HashRouter>/<Routes> component API --
// Shell.jsx reads each route's `handle` (e.g. { fullscreen: true }) via
// useMatches(), which only exists on the data-router APIs.
export const router = createHashRouter([
  {
    element: <Shell />,
    children: [
      { path: "/", element: <Overview /> },
      { path: "/insights", element: <Insights /> },
      { path: "/landscape", element: <Landscape /> },
      { path: "/company", element: <Company /> },
      {
        path: "/hologram",
        element: (
          <Suspense fallback={<div className="loading">Loading the interactive structure…</div>}>
            <Hologram />
          </Suspense>
        ),
        handle: { fullscreen: true },
      },
    ],
  },
]);
