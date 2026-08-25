import { Routes, Route } from "react-router-dom";
import Shell from "./components/shell/Shell";
import Overview from "./views/Overview";
import Insights from "./views/Insights";
import Landscape from "./views/Landscape";
import Company from "./views/Company";
import Hologram from "./views/Hologram";

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Overview />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/landscape" element={<Landscape />} />
        <Route path="/company" element={<Company />} />
        <Route path="/hologram" element={<Hologram />} handle={{ fullscreen: true }} />
      </Route>
    </Routes>
  );
}
