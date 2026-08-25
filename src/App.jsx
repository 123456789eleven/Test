import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
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

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Overview />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/landscape" element={<Landscape />} />
        <Route path="/company" element={<Company />} />
        <Route
          path="/hologram"
          element={
            <Suspense fallback={<div className="loading">Loading the interactive structure…</div>}>
              <Hologram />
            </Suspense>
          }
          handle={{ fullscreen: true }}
        />
      </Route>
    </Routes>
  );
}
