import { useEffect, useRef, useState } from "react";

// Radial SVG diagram of the four divisions with directional edges — a React
// port of the old window.renderDivisionFlow(containerId, opts) hand-built
// SVG renderer. Geometry/layout math is carried over essentially as-is;
// only the DOM construction changed from imperative createElementNS calls
// to declarative JSX SVG elements.

const ORDER = ["strategies", "advantage", "payroll", "advisory"];
const HUB_COLOR = { strategies: "#3b82f6", advantage: "#10b981", payroll: "#06b6d4", advisory: "#8b5cf6" };

function trimToward(from, toward, r) {
  const ang = Math.atan2(toward.y - from.y, toward.x - from.x);
  return { x: from.x + Math.cos(ang) * r, y: from.y + Math.sin(ang) * r };
}

// opts: { companyData, onNodeClick, onEdgeClick } — companyData needs
// `.divisions` (id/name/role lookup) and `.divisionFlow` (the edge list).
// onNodeClick/onEdgeClick are both optional; the caller may wire up either,
// neither, or both.
export default function DivisionFlow({ companyData, onNodeClick, onEdgeClick }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(520);

  // The old renderer sized off container.clientWidth once per render call.
  // A ResizeObserver keeps the layout correct as the container's width
  // changes (sidebar toggle, window resize, fullscreen, etc.), not just on
  // first mount.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(el.clientWidth || 0, 520));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const edges = companyData.divisionFlow || [];
  const height = Math.min(Math.max(width * 0.6, 320), 420);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.34;
  const nodeR = Math.min(width, height) * 0.105;

  const nodes = ORDER.map((id, i) => {
    const div = (companyData.divisions || []).find((d) => d.id === id) || { id, name: id, role: "" };
    const angle = i * (Math.PI / 2) - Math.PI / 2;
    return {
      id,
      name: div.name,
      role: div.role,
      color: HUB_COLOR[id],
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  });
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));

  function activateEdge(edge) {
    if (onEdgeClick) onEdgeClick(edge);
  }
  function activateNode(id) {
    if (onNodeClick) onNodeClick(id);
  }
  function handleActivateKeyDown(ev, activate, arg) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      activate(arg);
    }
  }

  return (
    <div ref={containerRef}>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="flow-svg">
        <defs>
          {edges.map((e) => (
            <marker
              key={`arrow-${e.from}-${e.to}`}
              id={`flowArrow-${e.from}-${e.to}`}
              viewBox="0 0 10 10"
              refX="8.5"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 Z" fill={(nodeById[e.from] || {}).color || "#888"} />
            </marker>
          ))}
        </defs>

        <g>
          {edges.map((e) => {
            const s = nodeById[e.from];
            const t = nodeById[e.to];
            if (!s || !t) return null;
            const mx = (s.x + t.x) / 2;
            const my = (s.y + t.y) / 2;
            const bow = 0.3;
            const qx = mx + (mx - cx) * bow;
            const qy = my + (my - cy) * bow;
            const startPt = trimToward(s, { x: qx, y: qy }, nodeR + 2);
            const endPt = trimToward(t, { x: qx, y: qy }, nodeR + 10);
            const d = `M${startPt.x.toFixed(1)},${startPt.y.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${endPt.x.toFixed(1)},${endPt.y.toFixed(1)}`;

            return (
              <g key={`edge-${e.from}-${e.to}`}>
                <path
                  d={d}
                  className="flow-edge"
                  stroke={s.color}
                  markerEnd={`url(#flowArrow-${e.from}-${e.to})`}
                  tabIndex={0}
                  role="button"
                  onClick={() => activateEdge(e)}
                  onKeyDown={(ev) => handleActivateKeyDown(ev, activateEdge, e)}
                />
                <text
                  x={qx.toFixed(1)}
                  y={qy.toFixed(1)}
                  textAnchor="middle"
                  className="flow-edge-label"
                  onClick={() => activateEdge(e)}
                >
                  {e.label}
                </text>
              </g>
            );
          })}
        </g>

        <g>
          {nodes.map((n) => (
            <g
              key={n.id}
              className="flow-node"
              transform={`translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`}
              tabIndex={0}
              role="button"
              onClick={() => activateNode(n.id)}
              onKeyDown={(ev) => handleActivateKeyDown(ev, activateNode, n.id)}
            >
              <circle r={nodeR} fill={n.color} />
              <text textAnchor="middle" dy="-2" className="flow-node-name">{n.name}</text>
              <text textAnchor="middle" dy="14" className="flow-node-role">{n.role}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
