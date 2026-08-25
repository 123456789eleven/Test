import { useEffect, useState } from "react";

/**
 * Shared horizontal bar chart — the `.hbar-row` / `.hbar-track` / `.hbar-fill`
 * family used by Insights (duration-by-jurisdiction, per-day penalty) and
 * Landscape (competitor revenue, competitor headcount).
 *
 * Renders bars at width 0 on mount, then fills them in on the next paint
 * (double-rAF, same trick the old vanilla views used) so the fill-in
 * transition actually plays instead of the bars just appearing full-width.
 *
 * Props:
 *  - data: [{ label, value, display }]  — `display` is the pre-formatted
 *    string shown at the end of the row (e.g. "18 mo.", "$1.31B").
 *  - max: number the bars are scaled against (not necessarily the max of
 *    `data` — e.g. the duration chart uses 20 even though the largest value
 *    is 18, to leave a little headroom).
 *  - axisTicks: optional string[] rendered as an evenly-spaced tick row
 *    under the bars.
 *  - table: optional { headers: string[], rows: (string|number)[][] } —
 *    renders a "View as table" fallback beneath the chart.
 */
export default function BarChart({ data, max, axisTicks, table }) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setFilled(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, []);

  return (
    <>
      {data.map((d, i) => (
        <div className="hbar-row" key={`${d.label}-${i}`}>
          <div className="lbl">{d.label}</div>
          <div className="hbar-track">
            <div
              className="hbar-fill"
              style={{ width: filled ? `${Math.min(100, (d.value / max) * 100)}%` : "0%" }}
            />
          </div>
          <div className="val mono">{d.display}</div>
        </div>
      ))}

      {axisTicks && (
        <div className="axis-ticks">
          <div />
          <div className="ticks">
            {axisTicks.map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
          <div />
        </div>
      )}

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
