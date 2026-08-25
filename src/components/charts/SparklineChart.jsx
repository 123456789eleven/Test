import { useLayoutEffect, useRef, useState } from "react";

/**
 * Shared SVG line/sparkline chart with per-point hover tooltips — the one
 * technique behind both Insights' TPA-market-size chart and every per-company
 * trend line on Landscape's Trends tab. Both used to be separate, near-
 * identical implementations; this is the single component both go through
 * now, parameterized by what actually varies between them.
 *
 * Props:
 *  - points: [{ x, y }]  — x is whatever the point is keyed by (a year
 *    number, an ISO date string...), y is the numeric value. Requires >= 2
 *    points; renders nothing otherwise (callers should show a "Baseline —"
 *    style fallback for single-point series instead of mounting this).
 *  - formatValue(y): string — used for end labels, the default grid label,
 *    and the tooltip's value.
 *  - formatX(x): string — used for per-point x-axis labels (`showXLabels`)
 *    and the tooltip's label.
 *  - width / height: viewBox size in px. Small per-company sparklines and
 *    the big market chart both just pass different sizes.
 *  - padding: optional { top, right, bottom, left } override — sane
 *    defaults are derived from showGrid / showXLabels otherwise.
 *  - showGrid + gridValues + gridFormat: horizontal reference lines with
 *    labels down the left edge (the market chart's $600B/$700B/$800B lines).
 *  - showXLabels: render every point's formatX(x) along the bottom (the
 *    market chart's year labels). Per-company sparklines leave this off.
 *  - yDomain: optional [min, max] override; otherwise derived from the data.
 *  - table: optional { headers, rows } — a "View as table" fallback,
 *    matching BarChart's.
 */
export default function SparklineChart({
  points,
  formatValue = (v) => String(v),
  formatX = (x) => String(x),
  width = 320,
  height = 90,
  padding,
  showGrid = false,
  gridValues = [],
  gridFormat,
  showXLabels = false,
  yDomain,
  table,
}) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const tipTextRef = useRef(null);
  const [tipWidth, setTipWidth] = useState(64);

  const pad = {
    top: padding?.top ?? (showGrid ? 20 : 16),
    right: padding?.right ?? (showGrid ? 30 : 8),
    bottom: padding?.bottom ?? (showXLabels ? 26 : 18),
    left: padding?.left ?? (showGrid ? 46 : 8),
  };

  const hasPoints = points && points.length >= 2;

  useLayoutEffect(() => {
    if (hoverIndex == null || !tipTextRef.current) return;
    const len = tipTextRef.current.getComputedTextLength();
    setTipWidth(Math.max(64, len + 20));
  }, [hoverIndex]);

  if (!hasPoints) return null;

  const innerW = Math.max(1, width - pad.left - pad.right);
  const innerH = Math.max(1, height - pad.top - pad.bottom);
  const values = points.map((p) => p.y);
  const [minV, maxV] = yDomain ?? [Math.min(...values), Math.max(...values)];
  const span = maxV - minV || 1;
  const x = (i) => pad.left + (i / (points.length - 1)) * innerW;
  const y = (v) => pad.top + innerH - ((v - minV) / span) * innerH;
  const coords = points.map((p, i) => [x(i), y(p.y)]);
  const baseY = pad.top + innerH;
  const linePath = coords.map(([cx, cy], i) => `${i === 0 ? "M" : "L"}${cx.toFixed(1)},${cy.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1][0].toFixed(1)},${baseY.toFixed(1)} L${coords[0][0].toFixed(1)},${baseY.toFixed(1)} Z`;

  const hovered = hoverIndex != null ? points[hoverIndex] : null;
  const hoveredCoord = hoverIndex != null ? coords[hoverIndex] : coords[0];

  return (
    <>
      <svg className="linechart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ height }}>
        {showGrid &&
          gridValues.map((v) => (
            <g key={v}>
              <line className="gridline" x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} />
              <text x={pad.left - 8} y={y(v) + 3} textAnchor="end">
                {(gridFormat || formatValue)(v)}
              </text>
            </g>
          ))}

        <line className="baseline" x1={pad.left} x2={width - pad.right} y1={baseY} y2={baseY} />
        <path className="area" d={areaPath} />
        <path className="line" d={linePath} />

        {coords.map(([cx, cy], i) => (
          <circle key={i} className="dot" cx={cx} cy={cy} style={{ r: hoverIndex === i ? 5.5 : 4 }} />
        ))}

        <text className="endlabel" x={coords[0][0]} y={coords[0][1] - 10} textAnchor="start">
          {formatValue(points[0].y)}
        </text>
        <text className="endlabel" x={coords[coords.length - 1][0]} y={coords[coords.length - 1][1] - 10} textAnchor="end">
          {formatValue(points[points.length - 1].y)}
        </text>

        {showXLabels &&
          points.map((p, i) => (
            <text key={i} x={coords[i][0]} y={height - 4} textAnchor="middle">
              {formatX(p.x)}
            </text>
          ))}

        {coords.map(([cx, cy], i) => (
          <circle
            key={i}
            className="hit"
            cx={cx}
            cy={cy}
            r={13}
            fill="transparent"
            tabIndex={0}
            aria-label={`${formatX(points[i].x)}: ${formatValue(points[i].y)}`}
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
            onFocus={() => setHoverIndex(i)}
            onBlur={() => setHoverIndex(null)}
          />
        ))}

        <g
          className="spark-tip"
          style={{ opacity: hoverIndex != null ? 1 : 0, transition: "opacity .12s ease" }}
          pointerEvents="none"
          transform={`translate(${hoveredCoord[0]}, ${hoveredCoord[1] - 8})`}
        >
          <rect className="spark-tip-rect" rx={5} width={tipWidth} x={-tipWidth / 2} y={-32} height={32} />
          <text ref={tipTextRef} className="spark-tip-text" x={0} y={-13} textAnchor="middle">
            {hovered ? `${formatX(hovered.x)}: ${formatValue(hovered.y)}` : ""}
          </text>
        </g>
      </svg>

      {table && (
        <details className="table-toggle">
          <summary>View as table</summary>
          <table>
            <thead>
              <tr>
                {table.headers.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </>
  );
}
